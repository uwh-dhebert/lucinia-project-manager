'use client';

import { Home, FolderOpen, Sparkles, Users, Settings, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { WikiSidebar } from '@/components/WikiSidebar';

export function AppSidebar() {
  const pathname = usePathname();
  const isWikiPage = pathname.includes('/wiki');
  return (
    <Sidebar>
      <SidebarContent>
        <div className="flex items-center gap-3 px-6 py-8 border-b border-lucina-muted/30">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl flex items-center justify-center">
            <span className="text-white text-3xl font-serif">L</span>
          </div>
          <div>
            <h1 className="text-3xl font-serif tracking-tight text-white">lucina</h1>
            <p className="text-xs text-lucina-muted">Project Manager</p>
          </div>
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
                  <a href="/ai-generator">
                    <Sparkles className="w-5 h-5" />
                    <span>AI Story Generator</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Wiki Tree Navigation - Only on wiki pages */}
        {isWikiPage && (
          <>
            <div className="border-t border-slate-700 my-2" />
            <WikiSidebar />
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
