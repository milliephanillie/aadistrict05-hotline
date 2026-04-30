import volunteers from "./volunteers.json";

const TWILIO_NUMBER = "+17153175060";

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
  const menuPrompt = buildMenuPrompt();
  const maxDigit = String(volunteers.length);

  const body = `
    <Say voice="Polly.Joanna">
      You have reached the District 7 AA hotline of Eau Claire and surrounding areas. Please listen closely as a list of volunteers will be provided. Volunteers all use their personal phones and may answer with a simple Hello. If they do not answer, please feel free to leave a voicemail with your name and phone number.
    </Say>
    <Pause length="1"/>
    <Gather numDigits="1" action="/connect" method="POST" timeout="10">
      <Say voice="Polly.Joanna">
        ${menuPrompt}
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
