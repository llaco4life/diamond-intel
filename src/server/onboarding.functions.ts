import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const HeadCoachInput = z.object({
  teamName: z.string().trim().min(1).max(80),
  ageGroup: z.string().trim().max(40).optional().nullable(),
});

export const completeAsHeadCoach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => HeadCoachInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase.rpc(
      "complete_head_coach_onboarding",
      {
        _team_name: data.teamName,
        _age_group: data.ageGroup ?? null,
      },
    );
    if (error) {
      return { success: false as const, reason: error.message };
    }
    const row = (rows ?? [])[0] as
      | { success: boolean; reason: string | null; org_id: string | null; team_id: string | null }
      | undefined;
    if (!row?.success) {
      return { success: false as const, reason: row?.reason ?? "unknown_error" };
    }
    return {
      success: true as const,
      orgId: row.org_id,
      teamId: row.team_id,
    };
  });
