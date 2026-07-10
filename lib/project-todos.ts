export const CONFLUENCE_DESIGN_DOC_URL =
  'https://id.atlassian.com/login?continue=https%3A%2F%2Fid.atlassian.com%2Fjoin%2Fuser-access%3Fresource%3Dari%253Acloud%253Aconfluence%253A%253Asite%252F01f924e1-b955-4c2b-ac44-a8d706cb9ba9%26continue%3Dhttps%253A%252F%252Funifiedhc.atlassian.net%252Fwiki%252Fspaces%252FLU%252Ffolder%252F825294849%252FStrategic%252BInitiatives&application=confluence&orgId=23d741c3-k788-1a4k-ja11-j6b529ak7kj';

export const CONFLUENCE_TASK_TITLE = 'Generate the Confluence Design Doc';
export const STORIES_PARENT_TITLE = 'Create user stories in Confluence';

export type TodoItemType = 'confluence' | 'stories_parent' | 'story' | 'custom';

export interface TodoItem {
  id: string;
  parentId: string | null;
  title: string;
  linkUrl: string | null;
  completed: boolean;
  sortOrder: number;
  storyId: string | null;
  itemType: TodoItemType;
  createdAt: string;
  updatedAt: string;
}

export function mapTodoRow(row: Record<string, unknown>): TodoItem {
  return {
    id: String(row.id),
    parentId: row.parent_id ? String(row.parent_id) : null,
    title: String(row.title ?? ''),
    linkUrl: row.link_url ? String(row.link_url) : null,
    completed: Boolean(row.completed),
    sortOrder: Number(row.sort_order ?? 0),
    storyId: row.story_id ? String(row.story_id) : null,
    itemType: (row.item_type as TodoItemType) ?? 'custom',
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

export function buildStorySubtaskTitle(storyTitle: string): string {
  return `Create story: ${storyTitle}`;
}