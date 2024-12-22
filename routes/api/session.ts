const openAiApiKey = Deno.env.get("OPENAI_API_KEY") ?? "";

export const handler = async (request: Request) => {
  const params = (new URL(request.url)).searchParams;
  const model = params.get("model") ?? "gpt-4o-realtime-preview-2024-12-17";
  const voice = params.get("voice") ?? "alloy";
  const instructions = params.get("instructions") ?? undefined;

  return await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      voice,
      instructions,
    }),
  });
};
