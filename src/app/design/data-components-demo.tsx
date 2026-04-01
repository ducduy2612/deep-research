"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function DataComponentsDemo() {
  const [sliderValue, setSliderValue] = useState([50]);

  return (
    <>
      {/* Select */}
      <Card className="bg-obsidian-surface-sheet border-none mb-6">
        <CardHeader>
          <CardTitle className="text-obsidian-on-surface">Select</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Choose a provider</Label>
          <Select>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent className="bg-obsidian-surface-float border-none">
              <SelectItem value="gemini">Google Gemini</SelectItem>
              <SelectItem value="openai">OpenAI Compatible</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card className="bg-obsidian-surface-sheet border-none mb-6">
        <CardHeader>
          <CardTitle className="text-obsidian-on-surface">Tabs</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-4">
              <p className="text-sm text-obsidian-on-surface-var">Overview tab content.</p>
            </TabsContent>
            <TabsContent value="details" className="pt-4">
              <p className="text-sm text-obsidian-on-surface-var">Details tab content.</p>
            </TabsContent>
            <TabsContent value="settings" className="pt-4">
              <p className="text-sm text-obsidian-on-surface-var">Settings tab content.</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Slider */}
      <Card className="bg-obsidian-surface-sheet border-none mb-6">
        <CardHeader>
          <CardTitle className="text-obsidian-on-surface">Slider</CardTitle>
          <CardDescription>Value: {sliderValue[0]}</CardDescription>
        </CardHeader>
        <CardContent>
          <Slider value={sliderValue} onValueChange={setSliderValue} max={100} step={1} />
        </CardContent>
      </Card>

      {/* Separator */}
      <Card className="bg-obsidian-surface-sheet border-none mb-6">
        <CardHeader>
          <CardTitle className="text-obsidian-on-surface">Separator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-obsidian-on-surface-var">Above separator</p>
          <Separator />
          <p className="text-sm text-obsidian-on-surface-var">Below separator</p>
        </CardContent>
      </Card>

      {/* Scroll Area */}
      <Card className="bg-obsidian-surface-sheet border-none mb-6">
        <CardHeader>
          <CardTitle className="text-obsidian-on-surface">Scroll Area</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-32 w-full rounded-md">
            <div className="p-4">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="text-sm text-obsidian-on-surface-var py-1">
                  Scrollable item {i + 1}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Resizable */}
      <Card className="bg-obsidian-surface-sheet border-none mb-6">
        <CardHeader>
          <CardTitle className="text-obsidian-on-surface">Resizable Panels</CardTitle>
        </CardHeader>
        <CardContent>
          <ResizablePanelGroup orientation="horizontal" className="min-h-[120px] rounded-md" defaultLayout={{ a: 50, b: 50 }}>
            <ResizablePanel id="a">
              <div className="flex h-full items-center justify-center p-4 bg-obsidian-surface-deck rounded-l-md">
                <span className="text-sm text-obsidian-on-surface-var">Panel A</span>
              </div>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel id="b">
              <div className="flex h-full items-center justify-center p-4 bg-obsidian-surface-deck rounded-r-md">
                <span className="text-sm text-obsidian-on-surface-var">Panel B</span>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </CardContent>
      </Card>

      {/* Tooltip */}
      <Card className="bg-obsidian-surface-sheet border-none mb-6">
        <CardHeader>
          <CardTitle className="text-obsidian-on-surface">Tooltip</CardTitle>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover me</Button>
              </TooltipTrigger>
              <TooltipContent className="bg-obsidian-surface-float border-none">
                <p className="text-sm">Tooltip content</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Popover */}
      <Card className="bg-obsidian-surface-sheet border-none mb-6">
        <CardHeader>
          <CardTitle className="text-obsidian-on-surface">Popover</CardTitle>
        </CardHeader>
        <CardContent>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Open Popover</Button>
            </PopoverTrigger>
            <PopoverContent className="bg-obsidian-surface-float border-none w-64">
              <div className="space-y-2">
                <h4 className="font-medium text-obsidian-on-surface">Popover Title</h4>
                <p className="text-sm text-obsidian-on-surface-var">Popover content with glassmorphism styling.</p>
              </div>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>
    </>
  );
}
