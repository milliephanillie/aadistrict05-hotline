import volunteers from "./volunteers.json";

const TWILIO_NUMBER = "+19204322600";
const GREETING_AUDIO_URL =
  "https://d362unqrwzvzrb.cloudfront.net/hotline-greeting.wav";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    const bodyText = await request.text();
    const params = new URLSearchParams(bodyText || "");
    const digits = params.get("Digits") || "";

    if (pathname.endsWith("/connect")) {
      return handleConnectSelection(digits);
    }

    return handleInitialMenu();
  }
};

function handleInitialMenu() {
  const gatherPrompt = buildMenuPrompt();
  const maxDigit = String(volunteers.length);

  const body = `
    <Play>${GREETING_AUDIO_URL}</Play>
    <Pause length="1"/>
    <Gather numDigits="1" action="/connect" method="POST" timeout="10">
      <Say voice="Polly.Joanna">
        ${gatherPrompt}
      </Say>
    </Gather>
    <Say voice="Polly.Joanna">
      We did not receive a selection. Please call back and press a number from 1 to ${maxDigit}.
    </Say>
    <Hangup/>
  `;

  return twimlResponse(body);
}

function handleConnectSelection(digits) {
  const selectedNumber = Number.parseInt(digits, 10);

  if (!Number.isInteger(selectedNumber)) {
    return invalidSelectionResponse();
  }

  const volunteer = volunteers[selectedNumber - 1];

  if (!volunteer?.phone) {
    return invalidSelectionResponse();
  }

  return twimlResponse(`
    <Say voice="Polly.Joanna">
      Connecting you now.
    </Say>
    <Dial callerId="${TWILIO_NUMBER}" answerOnBridge="true" timeout="25">
      ${volunteer.phone}
    </Dial>
  `);
}

function invalidSelectionResponse() {
  const maxDigit = String(volunteers.length);

  return twimlResponse(`
    <Say voice="Polly.Joanna">
      That was not a valid selection. Please call back and press a number from 1 to ${maxDigit}.
    </Say>
    <Hangup/>
  `);
}

function buildMenuPrompt() {
  if (!volunteers.length) {
    return "There are currently no volunteers configured. Please call back later.";
  }

  const options = volunteers
    .map((volunteer, index) => `Press ${index + 1} for ${volunteer.name}.`)
    .join(" ");

  return `To choose a volunteer, ${options}`;
}

function twimlResponse(bodyXml) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response>${bodyXml}</Response>`;
  return new Response(xml, {
    headers: { "Content-Type": "text/xml" }
  });
}
