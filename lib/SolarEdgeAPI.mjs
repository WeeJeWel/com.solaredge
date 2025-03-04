import fetch from 'node-fetch';

export default class SolarEdgeAPI {

  cookies = [];

  isLoggedIn() {
    return this.cookies.length > 0;
  }

  async login({
    username,
    password,
  }) {
    const res = await fetch('https://monitoring.solaredge.com/solaredge-apigw/api/login', {
      method: 'POST',
      body: new URLSearchParams({
        j_username: username,
        j_password: password,
      }),
      redirect: 'manual',
    });

    if (res.status !== 302) {
      throw new Error('Invalid e-mail and/or password.');
    }

    this.cookies = res.headers.raw()['set-cookie'].map(cookie => cookie.split(';')[0]);
  }

  async getSites() {
    if (!this.isLoggedIn()) {
      throw new Error('Not Logged In');
    }

    const res = await fetch('https://monitoring.solaredge.com/services/m/so/sites/', {
      headers: {
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

  async getSite({ siteId }) {
    if (!this.isLoggedIn()) {
      throw new Error('Not Logged In');
    }

    const res = await fetch(`https://monitoring.solaredge.com/solaredge-apigw/api/v3/sites/${siteId}`, {
      headers: {
        Cookie: this.cookies.join('; '),
      },
    });

    if (res.status === 401) {
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      throw new Error(res.statusText ?? 'Error Getting Site');
    }

    const site = await res.json();
    return site;
  }

  async getSitePowerflow({ siteId }) {
    if (!this.isLoggedIn()) {
      throw new Error('Not Logged In');
    }

    const res = await fetch(`https://monitoring.solaredge.com/services/m/so/dashboard/v2/site/${siteId}/powerflow/latest?components=consumption%2Cgrid%2Cstorage%2Cev-charger`, {
      headers: {
        Cookie: this.cookies.join('; '),
      },
    });

    if (res.status === 401) {
      this.cookies = [];
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      throw new Error(res.statusText ?? 'Error Getting Site Powerflow');
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
        Cookie: this.cookies.join('; '),
      },
    });

    if (res.status === 401) {
      this.cookies = [];
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      throw new Error(res.statusText ?? 'Error Getting Site Energy Overview');
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
        Cookie: this.cookies.join('; '),
      },
    });

    if (res.status === 401) {
      this.cookies = [];
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      throw new Error(res.statusText ?? 'Error Getting Site Energy Overview');
    }

    const measurements = await res.json();
    return measurements;
  }

}