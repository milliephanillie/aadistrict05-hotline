import schedule from "./schedule.json";

const CLOUDFRONT_URL = "d362unqrwzvzrb.cloudfront.net";
const ACTUAL_AUDIO_URL = `https://${CLOUDFRONT_URL}/District+7+Hotline.wav`;
const TWILIO_NUMBER = "+17153175060";
const SPANISH_PHONE = "+10000000000"; // TODO: replace with actual Spanish volunteer number

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    const bodyText = await request.text();
    const params = new URLSearchParams(bodyText || "");
    const digits = params.get("Digits") || "";

    if (pathname.endsWith("/selection")) {
      return handleSelection(digits);
    }

    return handleInitialMenu();
  }
};

function handleInitialMenu() {
  return twimlResponse(`
    <Gather numDigits="1" action="/selection" method="POST" timeout="5">
      <Say voice="Polly.Lupe" language="es-US">Para español, oprima el uno.</Say>
    </Gather>
    ${buildAudioAndDial()}
  `);
}

function handleSelection(digits) {
  if (digits === "1") {
    return twimlResponse(`
      <Say voice="Polly.Lupe" language="es-US">Por favor espere mientras le conectamos.</Say>
      <Dial callerId="${TWILIO_NUMBER}" answerOnBridge="true" timeout="25">
        <Number>${SPANISH_PHONE}</Number>
      </Dial>
    `);
  }

  return twimlResponse(buildAudioAndDial());
}

function buildAudioAndDial() {
  const volunteer = getScheduledVolunteer();

  const dialVerb = volunteer?.phone
    ? `<Dial callerId="${TWILIO_NUMBER}" answerOnBridge="true" timeout="25"><Number>${volunteer.phone}</Number></Dial>`
    : `<Say voice="Polly.Joanna">There are no volunteers available at this time. Please call back later.</Say><Hangup/>`;

  return `
    ${dialVerb}
  `;
}

function getScheduledVolunteer() {
  const now = new Date();
  const chicagoTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayKey = dayNames[chicagoTime.getDay()];
  const hour = chicagoTime.getHours();

  // Slot 1 (index 0): midnight–5am  (0–4)
  // Slot 2 (index 1): 5am–9am       (5–8)
  // Slot 3 (index 2): 9am–1pm       (9–12)
  // Slot 4 (index 3): 1pm–5pm       (13–16)
  // Slot 5 (index 4): 5pm–midnight  (17–23)
  let slotIndex;
  if (hour < 5) slotIndex = 0;
  else if (hour < 9) slotIndex = 1;
  else if (hour < 13) slotIndex = 2;
  else if (hour < 17) slotIndex = 3;
  else slotIndex = 4;

  const day = schedule.days.find(d => d.key === dayKey);
  if (!day) return null;

  return day.callers[slotIndex] || null;
}

function twimlResponse(bodyXml) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response>${bodyXml}</Response>`;
  return new Response(xml, {
    headers: { "Content-Type": "text/xml" }
  });
}
