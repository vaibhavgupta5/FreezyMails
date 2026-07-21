"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import CampaignWizard from "../../_components/CampaignWizard";
import { useCampaignStore } from "@/stores/useCampaignStore";
import PageSkeleton from "../../../_components/PageSkeleton";

export default function EditCampaignPage() {
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const { loadCampaign } = useCampaignStore();

  useEffect(() => {
    async function fetchCampaignData() {
      try {
        const [campaignRes, recipientsRes, templatesRes] = await Promise.all([
          fetch(`/api/campaigns/${id}`),
          fetch(`/api/campaigns/${id}/recipients`),
          fetch("/api/templates")
        ]);

        const campaign = await campaignRes.json();
        const recipients = await recipientsRes.json();
        const templates = await templatesRes.json();

        if (campaign && templates) {
          loadCampaign(campaign, recipients || [], templates);
        }
      } catch (err) {
        console.error("Failed to load campaign for editing", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCampaignData();
  }, [id, loadCampaign]);

  if (loading) return <PageSkeleton />;

  return <CampaignWizard campaignId={id} />;
}
