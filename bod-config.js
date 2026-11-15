/* BOD gateway switch.
 * ''  = current behaviour (reads the Google Sheet directly, trusts the dashboard session).
 * 'https://<your-worker>.workers.dev' = secure mode (ACTIVE): BOD asks for its own sign-in, and all data
 * comes through the gateway (see bod-gateway/README.md). Set this only after the gateway is deployed. */
window.BOD_GATEWAY_URL = window.BOD_GATEWAY_URL || 'https://apotek-alpro-bod-gateway.apotekalpro-digital.workers.dev';
