'use strict';

const querystring = require('querystring');
const axios = require('axios');


class InfluxDBReporter {
  
  constructor(newmanEmitter, reporterOptions, options) {
    this.newmanEmitter = newmanEmitter;
    this.reporterOptions = reporterOptions;
    this.options = options;
    this.context = {
      id: `${new Date().getTime()}-${Math.random()}`,
      currentItem: { index: 0 }
    }
    const events = 'start iteration item script request test assertion console exception done'.split(' ');
    events.forEach((e) => { if (typeof this[e] == 'function') newmanEmitter.on(e, (err, args) => this[e](err, args)) });

    console.log('reporterOptions', reporterOptions);
  }

  start(error, args) {
    this.context.server = this.reporterOptions.influxdbServer || this.reporterOptions.server;
    this.context.port = this.reporterOptions.influxdbPort || this.reporterOptions.port;
    this.context.name = this.reporterOptions.influxdbName || this.reporterOptions.name;
    this.context.measurement = this.reporterOptions.influxdbMeasurement || this.reporterOptions.measurement;
    this.context.username = this.reporterOptions.influxdbUsername || this.reporterOptions.username;
    this.context.password = this.reporterOptions.influxdbPassword || this.reporterOptions.password;

    if (!this.context.server) {
      throw new Error('[-] ERROR: InfluxDB Server Address is missing! Add --reporter-influxdb-server <server-address>.');
    }
    if (!this.context.port) {
      throw new Error('[-] ERROR: InfluxDB Server Port is missing! Add --reporter-influxdb-port <port-number>.');
    }
    if (!this.context.name) {
      throw new Error('[-] ERROR: InfluxDB Database Name is missing! Add --reporter-influxdb-name <database-name>.');
    }
    if (!this.context.measurement) {
      this.context.measurement = `api_results-${new Date().getTime()}`;
    }
    // this.stream = new SimpleUdpStream({
    //   destination: this.reporterOptions.influxdbServer,
    //   port: this.reporterOptions.influxdbPort
    // });
    console.log(`Starting: ${this.context.id}`);
  }

  beforeItem(error, args) {
    this.context.currentItem = {
      index: (this.context.currentItem.index + 1),
      name: '',
      data: {},
      failedAssertions: []
    };
  }

  request(error, args) {
    const { cursor, item, request } = args;

    console.log(`[+] Running ${item.name}`);

    const data = {
      collection_name: this.options.collection.name, 
      request_name: item.name,
      url: request.url.toString(),
      method: request.method,
      status: args.response.status,
      code: args.response.code,
      response_time: args.response.responseTime,
      response_size: args.response.responseSize,
      // executed: 'EXECUTED',
      // failed: 'FAILED',
      // skipped: 'SKIPPED'
    };

    this.context.currentItem.data = data;
    this.context.currentItem.name = item.name;
  }

  assertion(error, args) {
    const { assertion } = args
    // const result = error ? 'failed' : e.skipped ? 'skipped' : 'executed'

    if(error) {
      this.context.currentItem.data.failed = `FAILED: ${JSON.stringify(error)}`;
      this.context.currentItem.failedAssertions.push(assertion);
    } else if(error && error.skipped) {
      this.context.currentItem.data.skipped = 'FAILED';
    } else {
      this.context.currentItem.data.executed = 'EXECUTED';
    }
  }

  item(error, args) {
    console.log(`[${this.context.currentItem.index}] Processing ${this.context.currentItem.name}`);

    const binaryData = this.buildPayload(this.context.currentItem.data);
    // console.log('binaryData', binaryData);

    this.sendDataHTTP(binaryData);
  }

  done() {
    console.log(`[+] Finished collection: ${this.options.collection.name} (${this.context.id}))`);

    // this.stream.write(payload);
    // this.stream.done();

    // this.exports.push({
    //   name: 'newman-reporter-influxdb',
    //   options: reporterOptions
    // });
  }

  /// Private method starts here
  buildInfluxDBUrl(path='write') {
    const url = `http://${this.context.server}:${this.context.port}/${path}`;
    const params = {
      db: this.context.name,
      u: this.context.username,
      p: this.context.password,
    }

    const paramsQuerystring = querystring.stringify(params);

    const connectionUrl = `${url}?${paramsQuerystring}`;
    return connectionUrl;
  }

  async healthCheck() {
    let connectionUrl = this.buildInfluxDBUrl('ping');

    try {
      const data = await axios.get(connectionUrl);
    } catch (error) {
      console.log('[-] ERROR: not able to connect to influxdb', error);
    }
  }

  buildPayload(data) {
    const measurementName = this.context.measurement;
    let binaryData = querystring.stringify(data, ',', '=', { encodeURIComponent: str => str.replace(/ /g, '_') });
    binaryData = `${measurementName},${binaryData} value=${data.response_time}`;
    return binaryData;
  }

  async sendDataHTTP(data) {
    let connectionUrl = this.buildInfluxDBUrl();

    try {
      await axios.post(connectionUrl, data);
    } catch (error) {
      console.log('[-] ERROR: while sending data to influxdb', error);
    }
  }
};

module.exports = InfluxDBReporter;