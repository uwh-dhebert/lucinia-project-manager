'use client';

import { Home, FolderOpen, Sparkles, CheckSquare } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { WikiSidebar } from '@/components/WikiSidebar';
import { LucinaLogo } from '@/components/brand/LucinaLogo';

export function AppSidebar() {
  const pathname = usePathname();
  const isWikiPage = pathname.includes('/wiki');
  return (
    <Sidebar>
      <SidebarContent>
        <div className="flex items-center gap-3 px-6 py-8 border-b border-lucina-rose">
          <LucinaLogo href="/dashboard" width={120} height={36} />
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/dashboard">
                    <Home className="w-5 h-5" />
                    <span>Dashboard</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/projects">
                    <FolderOpen className="w-5 h-5" />
                    <span>Projects</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/tasks">
                    <CheckSquare className="w-5 h-5" />
                    <span>Tasks</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/ai-generator">
                    <Sparkles className="w-5 h-5" />
                    <span>AI Story Generator</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isWikiPage && (
          <>
            <div className="border-t border-lucina-rose my-2" />
            <WikiSidebar />
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}