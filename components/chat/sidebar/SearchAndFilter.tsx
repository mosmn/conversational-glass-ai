"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  Clock,
  Folder,
  User,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SearchAndFilterProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
}

const categories = ["All", "Work", "Personal", "Creative", "Learning"];

export function SearchAndFilter({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
}: SearchAndFilterProps) {
  const [showFilterMenu, setShowFilterMenu] = React.useState(false);

  return (
    <>
      {/* Search */}
      <div className="flex-shrink-0 px-6 pb-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-400 transition-colors duration-300" />
          <Input
            placeholder="🔍 Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 pr-12 h-12 bg-slate-700/30 border-slate-600/50 text-white placeholder-slate-500 focus:text-white rounded-xl backdrop-blur-sm focus:border-emerald-500/50 focus:bg-slate-700/50 transition-all duration-300 focus:shadow-lg focus:shadow-emerald-500/10"
          />
          <DropdownMenu open={showFilterMenu} onOpenChange={setShowFilterMenu}>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all duration-300 rounded-lg"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setSelectedCategory("All")}>
                <Clock className="mr-2 h-4 w-4" />
                All Chats
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCategory("Work")}>
                <Folder className="mr-2 h-4 w-4" />
                Work
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCategory("Personal")}>
                <User className="mr-2 h-4 w-4" />
                Personal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCategory("Creative")}>
                <Sparkles className="mr-2 h-4 w-4" />
                Creative
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCategory("Learning")}>
                <GraduationCap className="mr-2 h-4 w-4" />
                Learning
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Chat Categories */}
      <div className="flex-shrink-0 px-6 pb-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Badge
              key={category}
              variant="secondary"
              className={`cursor-pointer transition-colors ${
                selectedCategory === category
                  ? "bg-emerald-600 text-white border-emerald-500"
                  : "bg-slate-700 text-slate-200 hover:bg-slate-600 hover:text-white border-slate-600"
              }`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </div>
      </div>
    </>
  );
}
