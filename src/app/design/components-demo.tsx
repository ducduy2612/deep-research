"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function InteractionComponentsDemo() {
  return (
    <>
      {/* 1. Button */}
      <Card className="bg-obsidian-surface-sheet border-none mb-6">
        <CardHeader>
          <CardTitle className="text-obsidian-on-surface">Button</CardTitle>
          <CardDescription>Variants: default, secondary, outline, ghost, destructive, link</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </CardContent>
      </Card>

      {/* 2. Card (self-demonstrating) */}
      <Card className="bg-obsidian-surface-sheet border-none mb-6">
        <CardHeader>
          <CardTitle className="text-obsidian-on-surface">Card</CardTitle>
          <CardDescription>Content container with header, body, and footer</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-obsidian-on-surface-var">
            Cards use tonal layering (surface-sheet bg) with no borders. Separation via spacing and color shifts.
          </p>
        </CardContent>
        <CardFooter>
          <Button size="sm">Action</Button>
        </CardFooter>
      </Card>

      {/* 3. Accordion */}
      <Card className="bg-obsidian-surface-sheet border-none mb-6">
        <CardHeader>
          <CardTitle className="text-obsidian-on-surface">Accordion</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            <AccordionItem value="item-1">
              <AccordionTrigger>What is Obsidian Deep?</AccordionTrigger>
              <AccordionContent>
                A dark-only design system with tonal layering, no-line borders, and glassmorphism effects.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Surface hierarchy?</AccordionTrigger>
              <AccordionContent>
                Well → Deck → Sheet → Raised → Float → Bright. Each level adds luminance.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Signature pattern?</AccordionTrigger>
              <AccordionContent>
                The AI Pulse — a 4px vertical pill in primary color (#c0c1ff) indicating AI content.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* 4. Dialog */}
      <Card className="bg-obsidian-surface-sheet border-none mb-6">
        <CardHeader>
          <CardTitle className="text-obsidian-on-surface">Dialog</CardTitle>
          <CardDescription>Glassmorphism modal overlay</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open Dialog</Button>
            </DialogTrigger>
            <DialogContent className="bg-obsidian-surface-float/70 backdrop-blur-[20px] border-none">
              <DialogHeader>
                <DialogTitle className="text-obsidian-on-surface">Glassmorphism Dialog</DialogTitle>
                <DialogDescription>
                  Uses backdrop-blur and semi-transparent background per Obsidian Deep spec.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-obsidian-on-surface-var">
                  Floating elements use rgba(53, 52, 55, 0.7) with 20px blur and whisper shadow.
                </p>
              </div>
              <DialogFooter>
                <Button>Confirm</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* 5. Dropdown Menu */}
      <Card className="bg-obsidian-surface-sheet border-none mb-6">
        <CardHeader>
          <CardTitle className="text-obsidian-on-surface">Dropdown Menu</CardTitle>
        </CardHeader>
        <CardContent>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Open Menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-obsidian-surface-float border-none">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuItem>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>

      {/* 6 & 7. Input + Textarea */}
      <Card className="bg-obsidian-surface-sheet border-none mb-6">
        <CardHeader>
          <CardTitle className="text-obsidian-on-surface">Input &amp; Textarea</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="demo-input">Text Input</Label>
            <Input id="demo-input" placeholder="Type something..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-textarea">Text Area</Label>
            <Textarea id="demo-textarea" placeholder="Multi-line input..." rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* 8. Label */}
      <Card className="bg-obsidian-surface-sheet border-none mb-6">
        <CardHeader>
          <CardTitle className="text-obsidian-on-surface">Label</CardTitle>
          <CardDescription>Accessible form labels (see Input section above)</CardDescription>
        </CardHeader>
        <CardContent>
          <Label>This is a standalone label</Label>
        </CardContent>
      </Card>
    </>
  );
}
