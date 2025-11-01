import { NextResponse } from "next/server";
import { z } from "zod";
import twilio from "twilio";
import { buildMessage, type AgentProfile, type Contact } from "@/lib/message";

const requestSchema = z.object({
  batchId: z.string().optional(),
  profile: z.object({
    name: z.string().min(1),
    role: z.string().optional(),
    vibe: z.string().optional(),
    opener: z.string().optional(),
    signature: z.string().optional(),
  }),
  template: z.string().min(1),
  contacts: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        phone: z.string().min(1),
        company: z.string().optional(),
        notes: z.string().optional(),
        lastInteraction: z.string().optional(),
      })
    )
    .min(1),
});

type MessageResult = {
  contactId: string;
  status: "sent" | "error";
  detail?: string;
};

const missingEnvMessage =
  "Missing Twilio configuration. Ensure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and either TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID are set.";

const handler = async (request: Request) => {
  try {
    const payload = await request.json();
    const { profile, template, contacts } = requestSchema.parse(payload);

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

    if (!accountSid || !authToken || (!fromNumber && !messagingServiceSid)) {
      return NextResponse.json(
        { error: missingEnvMessage },
        { status: 500 }
      );
    }

    const client = twilio(accountSid, authToken);

    const normalizedProfile = normalizeProfile(profile);

    const results = await Promise.allSettled(
      contacts.map(async (contact) => {
        const body = buildMessage({
          profile: normalizedProfile,
          contact: contact as Contact,
          template,
        });

        const messageOptions: Parameters<typeof client.messages.create>[0] = {
          to: contact.phone,
          body,
        };

        if (messagingServiceSid) {
          messageOptions.messagingServiceSid = messagingServiceSid;
        } else if (fromNumber) {
          messageOptions.from = fromNumber;
        }

        const response = await client.messages.create(messageOptions);

        return {
          contactId: contact.id,
          status: "sent" as const,
          detail: `Message SID ${response.sid}`,
        };
      })
    );

    const normalized: MessageResult[] = results.map((entry, index) => {
      const contact = contacts[index];
      if (entry.status === "fulfilled") {
        return entry.value;
      }
      const detail =
        entry.reason instanceof Error
          ? entry.reason.message
          : "Unknown Twilio error.";
      return {
        contactId: contact.id,
        status: "error",
        detail,
      };
    });

    return NextResponse.json({ results: normalized });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? "Invalid request payload."
        : error instanceof Error
        ? error.message
        : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
};

const normalizeProfile = (
  profile: Partial<AgentProfile> & Pick<AgentProfile, "name">
): AgentProfile => ({
  name: profile.name,
  role: profile.role ?? "",
  vibe: profile.vibe ?? "",
  opener: profile.opener ?? "",
  signature: profile.signature ?? "",
});

export { handler as POST };
