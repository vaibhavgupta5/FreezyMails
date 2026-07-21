"use client";

import { useEffect } from "react";
import CampaignWizard from "../_components/CampaignWizard";
import { useCampaignStore } from "@/stores/useCampaignStore";

export default function NewCampaignPage() {
  const resetDraft = useCampaignStore((state) => state.resetDraft);

  useEffect(() => {
    resetDraft();
  }, [resetDraft]);

  return <CampaignWizard />;
}
