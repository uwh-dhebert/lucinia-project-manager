/**
 * Application Layer - Chat Use Case
 * Handles chat message processing with Grok AI
 * Restricted to user's accessible projects, wiki, and links
 */

import { randomUUID } from 'crypto';
import { IGrokService } from '@/infrastructure/external';
import { createClient } from '@/utils/supabase/server';
import { getAccessibleProjects } from '@/lib/project-access';

export interface ChatUseCaseRequest {
  userId: string;
  conversationId: string;
  userMessage: string;
  contextDocumentIds?: string[];
  useRag?: boolean;
  pageContext?: string;
}

export interface ChatUseCaseResponse {
  messageId: string;
  conversationId: string;
  userMessage: string;
  assistantMessage: string;
  tokensUsed: {
    prompt: number;
    completion: number;
  };
  model: string;
}

interface UserContext {
  projects: Array<{ id: string; name: string; description?: string; slug?: string; isOwner?: boolean }>;
  wikiTopics: Array<{ id: string; title: string; slug?: string; subjects?: Array<{ id: string; title: string; contentItems?: Array<{ title?: string; content: string }> }> }>;
  links: Array<{ id: string; title: string; url: string; groupName?: string }>;
  summary: string;
}

export class ChatUseCase {
  constructor(private grokService: IGrokService) {}

  async execute(request: ChatUseCaseRequest): Promise<ChatUseCaseResponse> {
    const messageId = randomUUID();
    const userContext = await this.loadUserContext(request.userId);
    const isRelevant = this.isQuestionRelevant(request.userMessage, userContext);

    if (!isRelevant && userContext.summary) {
      return {
        messageId,
        conversationId: request.conversationId,
        userMessage: request.userMessage,
        assistantMessage: `I can only help with questions about your projects, wiki content, and saved links. I don't have information about "${request.userMessage}".\n\nHere's what I can help you with:\n${userContext.summary}`,
        tokensUsed: { prompt: 0, completion: 0 },
        model: 'grok-4-1-fast-non-reasoning',
      };
    }

    const contextDocs = this.buildContextDocuments(userContext);
    const messages = [{ role: 'user' as const, content: request.userMessage }];
    const grokRequest = {
      messages,
      temperature: 0.7,
      max_tokens: 2048,
      systemPrompt: this.buildSystemPrompt(userContext, contextDocs, request.pageContext),
    };

    const grokResponse = await this.grokService.ragChat(grokRequest, contextDocs);

    return {
      messageId,
      conversationId: request.conversationId,
      userMessage: request.userMessage,
      assistantMessage: grokResponse.content,
      tokensUsed: grokResponse.tokens,
      model: grokResponse.model,
    };
  }

  private async loadUserContext(userId: string): Promise<UserContext> {
    try {
      const supabase = await createClient();

      const accessibleProjects = await getAccessibleProjects(supabase, userId);
      const projects = accessibleProjects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description ?? undefined,
        slug: p.slug,
        isOwner: p.isOwner,
      }));

      const { data: topics } = await supabase
        .from('topics')
        .select('id, title, slug, subjects(id, title, slug, content_items(id, title, content))')
        .order('order', { ascending: true })
        .limit(100);

      const enrichedWikiTopics: UserContext['wikiTopics'] = (topics ?? []).map((topic) => ({
        id: topic.id,
        title: topic.title,
        slug: topic.slug,
        subjects: ((topic.subjects as Array<{
          id: string;
          title: string;
          content_items?: Array<{ title?: string; content: string }>;
        }>) ?? []).map((subject) => ({
          id: subject.id,
          title: subject.title,
          contentItems: subject.content_items ?? [],
        })),
      }));

      const { data: linkGroups } = await supabase
        .from('link_groups')
        .select('id, name, links(id, title, url)')
        .eq('userId', userId)
        .limit(100);

      const links: UserContext['links'] = [];
      for (const group of linkGroups ?? []) {
        for (const link of (group.links as Array<{ id: string; title: string; url: string }>) ?? []) {
          links.push({
            id: link.id,
            title: link.title,
            url: link.url,
            groupName: group.name,
          });
        }
      }

      let summary = '';
      if (projects.length > 0) {
        summary += `📊 **Projects** (${projects.length}): ${projects.map((p) => p.name).join(', ')}\n`;
      }
      if (enrichedWikiTopics.length > 0) {
        summary += `📚 **Wiki Topics** (${enrichedWikiTopics.length}): ${enrichedWikiTopics.map((t) => t.title).join(', ')}\n`;
      }
      if (links.length > 0) {
        summary += `🔗 **Links** (${links.length}): ${links.map((l) => l.title).join(', ')}\n`;
      }

      return {
        projects,
        wikiTopics: enrichedWikiTopics,
        links,
        summary: summary || 'No projects, wiki content, or links available yet.',
      };
    } catch (error) {
      console.error('Error loading user context:', error);
      return {
        projects: [],
        wikiTopics: [],
        links: [],
        summary: 'I can help you with your projects, wiki content, and saved links.',
      };
    }
  }

  private buildContextDocuments(context: UserContext): string[] {
    const docs: string[] = [];

    if (context.projects.length > 0) {
      context.projects.forEach((project) => {
        docs.push(`PROJECT: ${project.name}
Slug: ${project.slug || 'N/A'}
Access: ${project.isOwner ? 'Owner' : 'Shared with you'}
${project.description ? `Description: ${project.description}` : ''}
---`);
      });
    }

    if (context.wikiTopics.length > 0) {
      context.wikiTopics.forEach((topic) => {
        let topicDoc = `WIKI TOPIC: ${topic.title}\n`;
        if (topic.subjects && topic.subjects.length > 0) {
          topic.subjects.forEach((subject) => {
            topicDoc += `\nSUBJECT: ${subject.title}\n`;
            if (subject.contentItems && subject.contentItems.length > 0) {
              subject.contentItems.forEach((item) => {
                topicDoc += `${item.title ? `- ${item.title}: ` : ''}${item.content.substring(0, 500)}...\n`;
              });
            }
          });
        }
        topicDoc += '---';
        docs.push(topicDoc);
      });
    }

    if (context.links.length > 0) {
      let linksDoc = 'SAVED LINKS:\n';
      context.links.forEach((link) => {
        linksDoc += `- [${link.title}](${link.url})${link.groupName ? ` (${link.groupName})` : ''}\n`;
      });
      linksDoc += '---';
      docs.push(linksDoc);
    }

    return docs.length > 0 ? docs : ['No accessible content available'];
  }

  private isQuestionRelevant(question: string, context: UserContext): boolean {
    const lowerQuestion = question.toLowerCase();

    const projectKeywords = [
      'project', 'task', 'work', 'deadline', 'assignee', 'status', 'progress',
      'create', 'update', 'delete', 'manage', 'plan', 'schedule', 'timeline',
      'completed', 'active', 'prioritized',
    ];
    const wikiKeywords = [
      'wiki', 'documentation', 'document', 'subject', 'topic', 'content', 'write',
      'edit', 'page', 'section', 'note', 'reference', 'guide', 'tutorial',
    ];
    const linkKeywords = ['link', 'url', 'website', 'web', 'resource', 'bookmark'];

    const hasProjectKeyword = projectKeywords.some((keyword) => lowerQuestion.includes(keyword));
    const hasWikiKeyword = wikiKeywords.some((keyword) => lowerQuestion.includes(keyword));
    const hasLinkKeyword = linkKeywords.some((keyword) => lowerQuestion.includes(keyword));

    const mentionsUserContent =
      context.projects.some((p) => lowerQuestion.includes(p.name.toLowerCase())) ||
      context.wikiTopics.some((t) => lowerQuestion.includes(t.title.toLowerCase())) ||
      context.links.some((l) => lowerQuestion.includes(l.title.toLowerCase())) ||
      lowerQuestion.includes('my project') ||
      lowerQuestion.includes('my wiki') ||
      lowerQuestion.includes('my link');

    return hasProjectKeyword || hasWikiKeyword || hasLinkKeyword || mentionsUserContent;
  }

  private buildSystemPrompt(context: UserContext, contextDocs: string[], pageContext?: string): string {
    const projectList = context.projects.length > 0
      ? `\n\nUser's Accessible Projects:\n${context.projects.map((p) => `- ${p.name}${p.isOwner ? '' : ' (shared)'}${p.description ? `: ${p.description}` : ''}`).join('\n')}`
      : '';

    const topicList = context.wikiTopics.length > 0
      ? `\n\nWiki Topics:\n${context.wikiTopics.map((t) => `- ${t.title}${t.subjects ? ` (${t.subjects.length} subjects)` : ''}`).join('\n')}`
      : '';

    const linkList = context.links.length > 0
      ? `\n\nUser's Saved Links:\n${context.links.map((l) => `- ${l.title}: ${l.url}`).join('\n')}`
      : '';

    const pageContextInfo = pageContext ? `\n\nCURRENT PAGE CONTEXT:\n${this.getPageContextInfo(pageContext, context)}` : '';

    return `You are Grok, an AI assistant restricted to helping only with the user's accessible project management data, wiki/documentation, and saved links.

CRITICAL RESTRICTIONS:
- You ONLY answer using the user's accessible projects (owned or shared with them), wiki content, and their personal saved links.
- Do NOT reference projects, links, or content the user does not have access to.
- For any question outside these scopes, politely decline and redirect.
- Do NOT provide general knowledge answers unrelated to the user's data.

${projectList}${topicList}${linkList}${pageContextInfo}

INSTRUCTIONS:
- Use only the provided context to answer questions
- Reference specific projects, wiki topics, or links when relevant
- Be conversational and helpful while staying within scope`;
  }

  private getPageContextInfo(pageContext: string, context: UserContext): string {
    if (pageContext.includes('user_is_viewing_project:')) {
      const projectSlug = pageContext.split(':')[1];
      const project = context.projects.find((p) => p.slug === projectSlug);
      if (project) {
        return `The user is viewing project "${project.name}". Refer to this project when they ask about "this project".`;
      }
    } else if (pageContext.includes('user_is_viewing_wiki_topic:')) {
      const parts = pageContext.split('_');
      const topicPart = parts.find((p) => p.startsWith('user_is_viewing_wiki_topic:'));
      const topicSlug = topicPart?.split(':')[1];
      const subjectPart = parts.find((p) => p.startsWith('subject:'));
      const subjectSlug = subjectPart?.split(':')[1];

      const topic = context.wikiTopics.find((t) => t.slug === topicSlug || t.title.toLowerCase() === topicSlug?.toLowerCase());
      if (topic) {
        let info = `The user is viewing wiki topic "${topic.title}"`;
        if (subjectSlug) {
          const subject = topic.subjects?.find((s) => s.title.toLowerCase() === subjectSlug?.toLowerCase());
          if (subject) info += `, subject "${subject.title}"`;
        }
        return `${info}.`;
      }
    } else if (pageContext === 'user_is_on_projects_page') {
      return 'The user is on the projects page.';
    } else if (pageContext === 'user_is_on_wiki_page') {
      return 'The user is on the wiki page.';
    } else if (pageContext === 'user_is_on_dashboard') {
      return 'The user is on the dashboard.';
    } else if (pageContext === 'user_is_on_links_page') {
      return `The user is on the links page with ${context.links.length} saved links.`;
    }

    return 'Help the user with their accessible projects, wiki, and links.';
  }
}