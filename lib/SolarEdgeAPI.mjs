import fetch from 'node-fetch';
import signIn from './CognitoSRP.mjs';

export default class SolarEdgeAPI {

  cookies = [];
  headers = {
    'User-Agent': 'SolarEdge/14 CFNetwork/1568.200.51 Darwin/24.1.0',
    'CLIENT-VERSION': '3.12',
  };

  isLoggedIn() {
    return this.cookies.length > 0;
  }

  async login({
    username,
    password,
  }) {
    // The old /solaredge-apigw/api/login endpoint now answers 410 Gone.
    // Sign-in goes through Cognito; the monitoring site then trades the
    // tokens for its own session cookies.
    let tokens;
    try {
      tokens = await signIn({ username, password });
    } catch (err) {
      if (err.type === 'NotAuthorizedException' || err.type === 'UserNotFoundException') {
        throw new Error('Invalid e-mail and/or password.');
      }
      throw err;
    }

    const res = await fetch('https://monitoring.solaredge.com/services/auth/token?legacy=false', {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id_token: tokens.IdToken,
        access_token: tokens.AccessToken,
        refresh_token: tokens.RefreshToken,
        expires_in: tokens.ExpiresIn,
        token_type: tokens.TokenType,
      }),
    });

    if (!res.ok) {
      throw new Error(`Login failed (${res.status})`);
    }

    // The monitoring site also sets a Cloudflare bot-management cookie, which
    // is not part of the session.
    this.cookies = (res.headers.raw()['set-cookie'] ?? [])
      .map(cookie => cookie.split(';')[0])
      .filter(cookie => !cookie.startsWith('__cf_bm='));

    if (!this.isLoggedIn()) {
      throw new Error('Login failed (no session)');
    }
  }

  async getSites() {
    if (!this.isLoggedIn()) {
      throw new Error('Not Logged In');
    }

    const res = await fetch('https://monitoring.solaredge.com/services/m/so/sites/', {
      headers: {
        ...this.headers,
        Cookie: this.cookies.join('; '),
      },
    });

    if (res.status === 401) {
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      throw new Error(res.statusText ?? 'Error Getting Sites');
    }

    const { sites } = await res.json();
    return sites;
  }

  async getSitePowerflow({ siteId }) {
    if (!this.isLoggedIn()) {
      throw new Error('Not Logged In');
    }

    const res = await fetch(`https://monitoring.solaredge.com/services/m/so/dashboard/v2/site/${siteId}/powerflow/latest?components=consumption%2Cgrid%2Cstorage%2Cev-charger`, {
      headers: {
        ...this.headers,
        Cookie: this.cookies.join('; '),
      },
    });

    if (res.status === 401) {
      this.cookies = [];
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({
        code: res.statusText,
        messages: ['Unknown Error']
      }));
      throw new Error(error?.code ?? 'Error Getting Site Powerflow');
    }

    const powerflow = await res.json();
    return powerflow;
  }

  async getSiteEnergyOverview({ siteId }) {
    if (!this.isLoggedIn()) {
      throw new Error('Not Logged In');
    }

    const res = await fetch(`https://monitoring.solaredge.com/services/m/so/dashboard/site/${siteId}/energyOverview`, {
      headers: {
        ...this.headers,
        Cookie: this.cookies.join('; '),
      },
    });

    if (res.status === 401) {
      this.cookies = [];
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({
        code: res.statusText,
        messages: ['Unknown Error']
      }));
      throw new Error(error?.code ?? 'Error Getting Site Energy Overview');
    }

    const energyOverview = await res.json();
    return energyOverview;
  }

  async getSiteMeasurements({
    siteId,
    period = 'YEAR',
    measurementUnit = 'WATT_HOUR',
    endDate = '2025-12-31',
  }) {
    if (!this.isLoggedIn()) {
      throw new Error('Not Logged In');
    }

    const url = new URL(`https://monitoring.solaredge.com/services/m/so/dashboard/site/${siteId}/measurements`);
    url.searchParams.append('period', period);
    url.searchParams.append('measurement-unit', measurementUnit);
    url.searchParams.append('end-date', endDate);

    const res = await fetch(url, {
      headers: {
        ...this.headers,
        Cookie: this.cookies.join('; '),
      },
    });

    if (res.status === 401) {
      this.cookies = [];
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({
        code: res.statusText,
        messages: ['Unknown Error']
      }));
      throw new Error(error?.code ?? 'Error Getting Site Measurements');
    }

    const measurements = await res.json();
    return measurements;
  }

  async getSiteDevices({
    siteId,
  }) {
    if (!this.isLoggedIn()) {
      throw new Error('Not Logged In');
    }

    const res = await fetch(`https://monitoring.solaredge.com/services/m/api/homeautomation/v1.0/sites/${siteId}/devices`, {
      headers: {
        ...this.headers,
        Cookie: this.cookies.join('; '),
      },
    });

    if (res.status === 401) {
      this.cookies = [];
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({
        code: res.statusText,
        messages: ['Unknown Error']
      }));
      throw new Error(error?.code ?? 'Error Getting Site Devices');
    }

    const devices = await res.json();
    return devices;
  }

  async getSiteDeviceApplianceSessionsHistory({
    siteId,
    reporterId,
    startTime = 0,
    endTime = 9999999999999,
  }) {
    if (!this.isLoggedIn()) {
      throw new Error('Not Logged In');
    }


    const res = await fetch(`https://monitoring.solaredge.com/services/m/api/homeautomation/v1.0/${siteId}/devices/${reporterId}/applianceSessionsHistory?timeRange=YEAR&endTime=${endTime}&startTime=${startTime}`, {
      headers: {
        ...this.headers,
        Cookie: this.cookies.join('; '),
      },
    });

    if (res.status === 401) {
      this.cookies = [];
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({
        code: res.statusText,
        messages: ['Unknown Error']
      }));
      throw new Error(error?.code ?? 'Error Getting Site Device Appliance Sessions History');
    }

    const applianceSessionsHistory = await res.json();
    return applianceSessionsHistory;
  }

  async setSiteDeviceApplianceActivationState({
    siteId,
    reporterId,
    state = {},
  }) {
    if (!this.isLoggedIn()) {
      throw new Error('Not Logged In');
    }

    const res = await fetch(`https://monitoring.solaredge.com/services/m/api/homeautomation/v1.0/${siteId}/devices/${reporterId}/activationState`, {
      method: 'PUT',
      headers: {
        ...this.headers,
        Cookie: this.cookies.join('; '),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(state),
    });

    if (res.status === 401) {
      this.cookies = [];
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({
        code: res.statusText,
        messages: ['Unknown Error']
      }));
      throw new Error(error?.code ?? 'Error Setting Site Device Appliance Activation State');
    }

    const applianceSessionsHistory = await res.json();
    return applianceSessionsHistory;

  }

}