'use strict';

const querystring = require('querystring');

const HttpService = require('./http.service');
const UdpService = require('./udp.service');


function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //不含最大值，含最小值
}

class InfluxDBReporter {


  constructor(newmanEmitter, reporterOptions, options) {
    this.newmanEmitter = newmanEmitter;
    this.reporterOptions = reporterOptions;
    // options 测试用例的执行参数..这个参数里面有很多业务属性的元数据,尤其是 note collection
    this.options = options;
    this.context = {
      // getTime() 返回从 1970 年 1 月 1 日至今的毫秒数。
      id: `${new Date().getTime()}-${getRandomInt(0,1000)}`,
      currentItem: { index: 0 },
      assertions: {
        total: 0,
        failed: [],
        skipped: []
      },
      list: []
    };
    const events = 'start iteration beforeItem item script request test assertion console exception done'.split(' ');
    events.forEach((e) => { if (typeof this[e] == 'function') newmanEmitter.on(e, (err, args) => this[e](err, args)) });

    // console.log('[+] Reporter Options', reporterOptions);
  }

  start(error, args) {

    // johnson note 此处直接hardcode,避免因为编程无法传入的问题
    // this.context.server = this.reporterOptions.influxdbServer || this.reporterOptions.server;
    // this.context.port = this.reporterOptions.influxdbPort || this.reporterOptions.port;
    // this.context.name = this.reporterOptions.influxdbName || this.reporterOptions.name;
    // this.context.measurement = this.reporterOptions.influxdbMeasurement || this.reporterOptions.measurement;
    // this.context.username = this.reporterOptions.influxdbUsername || this.reporterOptions.username;
    // this.context.password = this.reporterOptions.influxdbPassword || this.reporterOptions.password;
    // this.context.mode = this.reporterOptions.influxdbMode || this.reporterOptions.mode;
    // http://10.211.55.5:8086


    // note dev
    this.context.server = '10.211.55.5';
    this.context.port = '8086';
    // 数据库名字
    this.context.name = 'newman_reports';
    // 这个表名,也就是仅仅用来做后续数据上报的,所以,原则上是可以不作为这样大粒度的配置信息的
    this.context.measurement = 'api_results';
    // note change
    // this.context.username = this.reporterOptions.influxdbUsername || this.reporterOptions.username;
    // this.context.password = this.reporterOptions.influxdbPassword || this.reporterOptions.password;
    this.context.mode = 'http';


    // note product
    // this.context.server = '172.17.0.16';
    // this.context.port = '8086';
    // // 数据库名字 godeye_reports 需要实现建立
    // this.context.name = 'godeye_reports';
    // // 这个表名,也就是仅仅用来做后续数据上报的,所以,原则上是可以不作为这样大粒度的配置信息的
    // // 无需实现建立
    // this.context.measurement = 'api_results';
    // // note change
    // this.context.username = "godeye";
    // this.context.password = "influxdb";
    // this.context.mode = 'http';

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
      // this.context.measurement = `api_results_${new Date().getTime()}`;
      throw new Error('[-] ERROR: InfluxDB Measurement Name is missing! Add --reporter-influxdb-measurement <measurement-name>.');
    }
    if (!this.context.mode) {
      this.context.mode = 'http';
    }

    const DataService = this.context.mode === 'udp' ? UdpService : HttpService;
    this.service = new DataService(this.context);
    console.log(`[+] 极牛-开始执行测试集: [${this.options.collection.name}#(${this.context.id})]`);
  }

  beforeItem(error, args) {
    // console.log('beforeItem');
    // console.log('beforeItem error', error);
    // console.log('beforeItem args', args);

    this.context.list.push(this.context.currentItem);

    this.context.currentItem = {
      index: (this.context.currentItem.index + 1),
      name: '',
      data: {}
    };
  }

  // 核心方法,入口方法
  request(error, args) {
    const { cursor, item, request } = args;

    console.log(`[+] 极牛-执行测试集[${this.options.collection.name}#${this.context.currentItem.index}(${item.name})]`);

    // 从数据源组装数据
    const data = {
      collection_name: this.options.collection.name, 
      request_name: item.name,
      rawurl: request.url.toString(),
      method: request.method,
      // TypeError: Cannot read property 'status' of undefined
      status: args.response.status,
      code: args.response.code,
      response_time: args.response.responseTime,
      response_size: args.response.responseSize,
      test_status: 'PASS',
      assertions: 0,
      failed_count: 0,
      skipped_count: 0,
      failed: [],
      skipped: []
    };

    if (data.rawurl.length >0 ){
      let index = data.rawurl.indexOf('?',0);
      if (index !== -1){
        // substring() 方法返回的子串包括 start 处的字符，但不包括 stop 处的字符。
        data.url = data.rawurl.substring(0,index);
      } else{
        data.url = data.rawurl;
      }

    }

    this.context.currentItem.data = data;
    this.context.currentItem.name = item.name;
  }

  exception(error, args) {
    // TODO: 
  }

  assertion(error, args) {
    this.context.currentItem.data.assertions++;

    if(error) {
      this.context.currentItem.data.test_status = 'FAIL';

      const failMessage = `${error.test} | ${error.name}: ${error.message}`;
      this.context.currentItem.data.failed.push(failMessage);
      this.context.currentItem.data.failed_count++;
      this.context.assertions.failed.push(failMessage); // for debug only
    } else if(args.skipped) {
      if(this.context.currentItem.data.test_status !== 'FAIL') {
        this.context.currentItem.data.test_status = 'SKIP';
      }

      const skipMessage = args.assertion;
      this.context.currentItem.data.skipped.push(args.assertion);
      this.context.currentItem.data.skipped_count++;
      this.context.assertions.skipped.push(skipMessage); // for debug only
    }
  }

  item(error, args) {
    // 构建数据
    const binaryData = this.buildPayload(this.context.currentItem.data);
    // console.log('binaryData', binaryData);

    // 发送数据给db
    this.service.sendData(binaryData);

    //如果需要新增数据上报,可以考虑在此处添加
    // // 构建数据
    // const binaryData = this.buildPayload(this.context.currentItem.data);
    // // console.log('binaryData', binaryData);
    //
    // // 发送数据给db
    // this.service.sendData(binaryData);
  }

  done() {
    console.log(`[+] 极牛-结束执行测试集: [${this.options.collection.name}#(${this.context.id})]`);

    // console.log('this.context', this.context);
    // console.log('this.options.collection', this.options.collection);

    // this.stream.write(payload);
    // this.stream.done();

    // this.exports.push({
    //   name: 'newman-reporter-influxdb',
    //   options: reporterOptions
    // });
  }

  /// Private method starts here

  // 构建上报数据负载
  buildPayload(data) {
    // 表名
    const measurementName = this.context.measurement;

    if(data.failed.length) {
      // 分割符号使用的是','号
      data.failed = data.failed.join(',');
    } else {
      delete data.failed;
    }

    if(data.skipped.length) {
      // 分割符号使用的是','号
      data.skipped = data.skipped.join(',');
    } else {
      delete data.skipped;
    }

    let binaryData = querystring.stringify(data, ',', '=', { encodeURIComponent: this._encodeURIComponent });
    // 此处是真正需要发送给时序数据库记录的数据
    binaryData = `${measurementName},${binaryData} value=${data.response_time}\n`;
    //TODO 还可以在记录其他的测量值

    return binaryData;
  }

  _encodeURIComponent(str) {
    return str.replace(/ /g, '\\ ')
              .replace(/,/g, '\\,')
              .replace(/=/g, '\\=');
  }

};

module.exports = InfluxDBReporter;