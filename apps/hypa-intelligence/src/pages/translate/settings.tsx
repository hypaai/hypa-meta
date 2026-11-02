/* eslint-disable */
// @ts-nocheck
import { useState } from "react";
import MainFooter from "@/components/shared/main-footer";

import {
  BehaviourSettings,
  LanguageDefault,
  SettingsAbout,
  SettingsAppearance,
  SettingsDataManagement,
  VoiceSettings,
} from "@/components/modules/settings";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Search,
  Languages,
  Settings as SettingsIcon,
  Palette,
  Volume2,
  Database,
  Info,
} from "lucide-react";
import { VOICE_OPTIONS } from "@/constants/app.constants";

const Settings = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("general");


  const settingsTabs = [
    {
      id: "general",
      label: "General",
      icon: SettingsIcon,
      component: <BehaviourSettings />,
      keywords: [
        "behavior",
        "behaviour",
        "inline",
        "translate",
        "auto",
        "history",
      ],
    },
    {
      id: "languages",
      label: "Languages",
      icon: Languages,
      component: <LanguageDefault />,
      keywords: ["language", "default", "source", "target"],
    },
    {
      id: "appearance",
      label: "Appearance",
      icon: Palette,
      component: <SettingsAppearance />,
      keywords: ["theme", "appearance", "dark", "light", "system"],
    },
    {
      id: "voice",
      label: "Voice",
      icon: Volume2,
      component: <VoiceSettings />,
      keywords: [
        "voice",
        "speech",
        "audio",
        "speed",
        "pitch",
        "tts",
        ...VOICE_OPTIONS,
      ],
    },
    {
      id: "data",
      label: "Data",
      icon: Database,
      component: <SettingsDataManagement />,
      keywords: ["data", "export", "clear", "reset", "history"],
    },
    {
      id: "about",
      label: "About",
      icon: Info,
      component: <SettingsAbout />,
      keywords: ["about", "version", "support", "contact", "help"],
    },
  ];

  const filteredTabs = searchQuery
    ? settingsTabs.filter(
        (tab) =>
          tab.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tab.keywords.some((keyword) =>
            keyword.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
      )
    : settingsTabs;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 space-y-6 md:space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground mb-4">
            Settings
          </h1>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Settings Content */}
        <Tabs className="w-full" value={activeTab} onValueChange={setActiveTab}>
          {/* Tab Navigation */}
          <TabsList className="grid grid-cols-3 gap-2 lg:grid-cols-6 w-full mb-8 h-auto p-1 bg-muted/50">
            {filteredTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                className="flex flex-col items-center gap-1 p-3 data-[state=active]:bg-background"
                value={tab.id}
              >
                <tab.icon className="size-4" />
                <span className="text-xs font-medium">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab Content */}
          <div className="space-y-6">
            {filteredTabs.map((tab) => (
              <TabsContent key={tab.id} className="mt-0" value={tab.id}>
                {tab.component}
              </TabsContent>
            ))}
          </div>

          {/* No results message */}
          {filteredTabs.length === 0 && (
            <div className="text-center py-12">
              <Search className="size-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No settings found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your search query to find what you're looking for.
              </p>
            </div>
          )}
        </Tabs>
      </div>

    </div>
  );
};

export default Settings;
