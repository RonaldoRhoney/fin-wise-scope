import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFinwise } from "@/lib/finwise/store";

export function useIsAdmin() {
  const { session } = useFinwise();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const uid = session?.user?.id;
    if (!uid) {
      setIsAdmin(false);
      setChecked(true);
      return;
    }
    setChecked(false);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setIsAdmin(!!data);
        setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  return { isAdmin, checked };
}
