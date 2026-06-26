import volunteers from "./volunteers.json";

const CLOUDFRONT_URL = "d362unqrwzvzrb.cloudfront.net";
const ACTUAL_AUDIO_URL = `https://${CLOUDFRONT_URL}/district-7-greeting-1782509183402.wav`;
const TWILIO_NUMBER = "+17153175060";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    const bodyText = await request.text();
    const params = new URLSearchParams(bodyText || "");
    const digits = params.get("Digits") || "";

    if (pathname.endsWith("/connect")) {
      return handleConnect(digits);
    }

    return handleInitialMenu();
  }
};

function handleInitialMenu() {
  const menuItems = volunteers
    .map((v, i) => `Press ${i + 1} for ${v.name}.`)
    .join(" ");

  return twimlResponse(`
    <Play>${ACTUAL_AUDIO_URL}</Play>
    <Gather numDigits="1" action="/connect" method="POST" timeout="10">
      <Say voice="Polly.Joanna">${menuItems}</Say>
    </Gather>
    <Say voice="Polly.Joanna">We did not receive a selection. Please call back and try again.</Say>
    <Hangup/>
  `);
}

function handleConnect(digits) {
  const index = parseInt(digits, 10) - 1;
  const volunteer = volunteers[index];

  if (!volunteer?.phone) {
    return twimlResponse(`
      <Say voice="Polly.Joanna">That was not a valid selection. Please call back and try again.</Say>
      <Hangup/>
    `);
  }

  return twimlResponse(`
    <Say voice="Polly.Joanna">Connecting you now.</Say>
    <Dial callerId="${TWILIO_NUMBER}" answerOnBridge="true" timeout="25">
      <Number>${volunteer.phone}</Number>
    </Dial>
  `);
}

function twimlResponse(bodyXml) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response>${bodyXml}</Response>`;
  return new Response(xml, {
    headers: { "Content-Type": "text/xml" }
  });
}
