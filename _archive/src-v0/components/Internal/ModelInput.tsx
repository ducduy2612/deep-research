"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ModelInputProps {
  value: string | undefined;
  onChange: (value: string) => void;
  models: string[];
  hasModels: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function ModelInput({
  value,
  onChange,
  models,
  hasModels,
  isRefreshing,
  onRefresh,
}: ModelInputProps) {
  const { t } = useTranslation();
  const id = useId();

  return (
    <div className="form-field w-full">
      <Input
        list={id}
        className="w-full"
        placeholder={t("setting.modelListPlaceholder")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hasModels ? (
        <datalist id={id}>
          {models.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          disabled={isRefreshing}
          onClick={onRefresh}
        >
          <RefreshCw className={isRefreshing ? "animate-spin" : ""} />
        </Button>
      )}
    </div>
  );
}
