"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";

export async function signup(formData: FormData) {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!companyName || !fullName || !email || !password) {
    redirect("/signup?error=Completa%20todos%20los%20campos");
  }

  const supabase = await createClient();

  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    redirect(`/signup?error=${encodeURIComponent(signUpError.message)}`);
  }

  const { error: rpcError } = await supabase.rpc("create_company_with_owner", {
    p_company_name: companyName,
    p_company_slug: `${slugify(companyName)}-${Math.random().toString(36).slice(2, 7)}`,
    p_full_name: fullName,
  });

  if (rpcError) {
    redirect(`/signup?error=${encodeURIComponent(rpcError.message)}`);
  }

  redirect("/dashboard");
}
