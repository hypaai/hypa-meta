// @ts-nocheck
import { useState } from "react";
import { useSettings } from "@/context/settings-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { ChevronDown, LogOut, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  ASR_MODELS,
  OCR_MODELS,
  TRANSLATION_MODELS,
  TTS_MODELS,
} from "@/constants/app.constants";
import { toast } from "sonner";

import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { Checkbox } from "../../ui/checkbox";
import CardWidth from "../../ui/card-with";

const BehaviourSettings = () => {
  const {
    settings,
    updateBehaviorSetting,
    updateSettings,
    getBehaviorSettings,
    getHistoryOptions,
  } = useSettings();

  const behaviorSettings = getBehaviorSettings();
  const historyOptions = getHistoryOptions();
  const navigate = useNavigate();

  const llmOptions: {
    name: string;
    displayName?: string;
    modelCardUrl?: string;
  }[] = TRANSLATION_MODELS;
  const currentModel =
    settings.llmModel || (llmOptions[0] && llmOptions[0].name) || "";

  const ttsOptions: {
    name: string;
    displayName?: string;
    modelCardUrl?: string;
    notes?: string;
  }[] = TTS_MODELS;
  const currentTTSModel =
    settings.ttsModel || (ttsOptions[0] && ttsOptions[0].name) || "";

  const asrOptions: {
    name: string;
    displayName?: string;
    modelCardUrl?: string;
  }[] = ASR_MODELS;
  const currentASRModel =
    settings.asrModel || (asrOptions[0] && asrOptions[0].name) || "";

  const ocrOptions: {
    name: string;
    displayName?: string;
    modelCardUrl?: string;
  }[] = OCR_MODELS;
  const currentOCRModel =
    settings.ocrModel || (ocrOptions[0] && ocrOptions[0].name) || "";


  return (
    <CardWidth>
      <h3 className="text-card-foreground font-semibold text-base lg:text-2xl xl:text-4xl">
        Behavior Settings
      </h3>
      <div className="space-y-6 my-8">
        {behaviorSettings.map((item) => (
          <div key={item.key} className="flex gap-3 items-start">
            <Checkbox
              checked={
                settings.behavior[item.key as keyof typeof settings.behavior]
              }
              className="mt-1 flex-shrink-0"
              onCheckedChange={(checked) =>
                updateBehaviorSetting(
                  item.key as keyof typeof settings.behavior,
                  checked,
                )
              }
            />
            <div className="flex-1">
              <p className="text-card-foreground font-medium text-sm lg:text-lg xl:text-xl">
                {item.name}
              </p>
              <p className="text-muted-foreground text-xs lg:text-base xl:text-lg mt-1">
                {item.explanation}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="mb-6">
          <p className="text-lg text-card-foreground font-medium mb-3">
            LLM Model
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Model selector"
                className="min-w-[280px] lg:min-w-[400px] justify-between"
                variant="outline"
              >
                <span className="truncate">
                  {llmOptions.find((m) => m.name === currentModel)
                    ?.displayName ||
                    currentModel ||
                    "Select model"}
                </span>
                <ChevronDown className="size-4 flex-shrink-0 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-80 min-w-[280px] lg:min-w-[400px] overflow-auto"
            >
              <DropdownMenuLabel>Available models</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {llmOptions.map((m) => (
                <DropdownMenuItem
                  key={m.name}
                  className={settings.llmModel === m.name ? "bg-accent" : ""}
                  onClick={() => {
                    updateSettings("llmModel", m.name);
                    toast.success(`Switched to ${m.displayName || m.name}`, {
                      description: "Voice settings updated automatically",
                    });
                  }}
                >
                  <div className="flex flex-col w-full min-w-0">
                    <span className="font-medium">
                      {m.displayName || m.name}
                    </span>
                    {m.modelCardUrl && (
                      <a
                        className="mt-1 w-max"
                        href={m.modelCardUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <span className="text-xs text-muted-foreground hover:underline cursor-pointer">
                          View model
                        </span>
                      </a>
                    )}
                  </div>
                  {settings.llmModel === m.name && (
                    <Check className="size-4 ml-auto shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {ttsOptions.length > 0 && (
          <div className="mb-6">
            <p className="text-lg text-card-foreground font-medium mb-3">
              TTS Model
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="TTS Model selector"
                  className="min-w-[280px] lg:min-w-[400px] justify-between"
                  variant="outline"
                >
                  <span className="truncate">
                    {ttsOptions.find((m) => m.name === currentTTSModel)
                      ?.displayName ||
                      currentTTSModel ||
                      "Select TTS model"}
                  </span>
                  <ChevronDown className="size-4 flex-shrink-0 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="max-h-80 min-w-[280px] lg:min-w-[400px] overflow-auto"
              >
                <DropdownMenuLabel>Available TTS models</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ttsOptions.map((m) => (
                  <DropdownMenuItem
                    key={m.name}
                    className={settings.ttsModel === m.name ? "bg-accent" : ""}
                    onClick={() => {
                      updateSettings("ttsModel", m.name);
                      toast.success(`Switched to ${m.displayName || m.name}`, {
                        description: "Voice settings updated automatically",
                      });
                    }}
                  >
                    <div className="flex flex-col w-full min-w-0">
                      <span className="font-medium">
                        {m.displayName || m.name}
                      </span>
                      {/* {m.notes && (
                          <span className="text-xs text-muted-foreground mt-1">{m.notes}</span>
                        )} */}
                      {m.modelCardUrl && m.modelCardUrl !== "N/A" && (
                        <a
                          className="mt-1 w-max"
                          href={m.modelCardUrl}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          <span className="text-xs text-muted-foreground hover:underline cursor-pointer">
                            View model
                          </span>
                        </a>
                      )}
                    </div>
                    {settings.ttsModel === m.name && (
                      <Check className="size-4 ml-auto shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {asrOptions.length > 0 && (
          <div className="mb-6">
            <p className="text-lg text-card-foreground font-medium mb-3">
              ASR Model
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="ASR Model selector"
                  className="min-w-[280px] lg:min-w-[400px] justify-between"
                  variant="outline"
                >
                  <span className="truncate">
                    {asrOptions.find((m) => m.name === currentASRModel)
                      ?.displayName ||
                      currentASRModel ||
                      "Select ASR model"}
                  </span>
                  <ChevronDown className="size-4 flex-shrink-0 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="max-h-80 min-w-[280px] lg:min-w-[400px] overflow-auto"
              >
                <DropdownMenuLabel>Available ASR models</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {asrOptions.map((m) => (
                  <DropdownMenuItem
                    key={m.name}
                    className={settings.asrModel === m.name ? "bg-accent" : ""}
                    onClick={() => {
                      updateSettings("asrModel", m.name);
                      toast.success(`Switched to ${m.displayName || m.name}`, {
                        description: "Voice settings updated automatically",
                      });
                    }}
                  >
                    <div className="flex flex-col w-full min-w-0">
                      <span className="font-medium">
                        {m.displayName || m.name}
                      </span>
                      {m.modelCardUrl && (
                        <a
                          className="mt-1 w-max"
                          href={m.modelCardUrl}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          <span className="text-xs text-muted-foreground hover:underline cursor-pointer">
                            View model
                          </span>
                        </a>
                      )}
                    </div>
                    {settings.asrModel === m.name && (
                      <Check className="size-4 ml-auto shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {ocrOptions.length > 0 && (
          <div className="mb-6">
            <p className="text-lg text-card-foreground font-medium mb-3">
              OCR Model
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="OCR Model selector"
                  className="min-w-[280px] lg:min-w-[400px] justify-between"
                  variant="outline"
                >
                  <span className="truncate">
                    {ocrOptions.find((m) => m.name === currentOCRModel)
                      ?.displayName ||
                      currentOCRModel ||
                      "Select OCR model"}
                  </span>
                  <ChevronDown className="size-4 flex-shrink-0 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="max-h-80 min-w-[280px] lg:min-w-[400px] overflow-auto"
              >
                <DropdownMenuLabel>Available OCR models</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ocrOptions.map((m) => (
                  <DropdownMenuItem
                    key={m.name}
                    className={settings.ocrModel === m.name ? "bg-accent" : ""}
                    onClick={() => {
                      updateSettings("ocrModel", m.name);
                      toast.success(`Switched to ${m.displayName || m.name}`, {
                        description: "Voice settings updated automatically",
                      });
                    }}
                  >
                    <div className="flex flex-col w-full min-w-0">
                      <span className="font-medium">
                        {m.displayName || m.name}
                      </span>
                      {m.modelCardUrl && (
                        <a
                          className="mt-1 w-max"
                          href={m.modelCardUrl}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          <span className="text-xs text-muted-foreground hover:underline cursor-pointer">
                            View model
                          </span>
                        </a>
                      )}
                    </div>
                    {settings.ocrModel === m.name && (
                      <Check className="size-4 ml-auto shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <p className="text-lg text-card-foreground font-medium mb-3">
          History items to keep
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="History items selector"
              className="min-w-40 lg:w-56 justify-between"
              variant="outline"
            >
              <span>{settings.historyItemsToKeep} items</span>
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-80 w-56 overflow-auto"
          >
            <DropdownMenuLabel>Items</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {historyOptions.map((count) => (
              <DropdownMenuItem
                key={count}
                className={
                  settings.historyItemsToKeep === count ? "bg-accent" : ""
                }
                onClick={() => updateSettings("historyItemsToKeep", count)}
              >
                <span className="flex-1 min-w-0">{count} items</span>
                {settings.historyItemsToKeep === count && (
                  <Check className="size-4 ml-auto shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </CardWidth>
  );
};

export default BehaviourSettings;
