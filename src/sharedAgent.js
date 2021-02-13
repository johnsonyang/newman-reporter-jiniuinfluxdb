const http = require('http');
const https = require('https');

let httpAgent;
let httpsAgent;
// note 构建连接池
// new Agent([options])
// options 代理的配置选项
// keepAlive <boolean> 保持socket可用即使没有请求，为后面的请求使用，而不是重新建立TCP链接
// keepAlive<number> 当使用了keepAlive选项时，该选项指定TCP keep-alive数据包的初始化延迟，当keepAlive选项为false或者undefined时。改选项无效，默认为1000
// maxSockets<number> 每个主机允许的最大sockets数量。默认为Infinity
// maxFreeSockets<number> 在空闲状态下允许打开的最大socket数值，仅当keepAlive为true时才有效，默认值为256.
// timeout<number> socket超时毫秒数，socket连接建立之后超时时间（指客户端从服务端读取数据的超时时间），这将在套接字建立连接后设置超时。note  也就是数据读写的超时时间。。。
// ** http.request()使用的默认http.globalAgent的选项均为各自的默认值**
//
// 若要配置其中任何一个，则需要创建自定义的http.agent实例

// note const声明常量还有两个好处，一是阅读代码的人立刻会意识到不应该修改这个值，二是防止了无意间修改变量值所导致的错误。
// note 以下的配置项来自nodejs v14.15.4版本。。。
const config = {
  keepAlive: true,
  keepAliveMsecs: 12000,
  maxSockets: 300,
  maxTotalSockets:600,
  maxFreeSockets:300,
  timeout:1500
};

const sharedAgent = {
  get http() {
    httpAgent = httpAgent || new http.Agent(config);
    return httpAgent;
  },
  get https() {
    httpsAgent = httpsAgent || new https.Agent(config);
    return httpsAgent;
  },
  get maxSockets() {
    return config.maxSockets;
  },
  set maxSockets(max) {
    if (typeof max !== 'number' || max < 1 || max > 3999) {
      throw new TypeError('Invalid value for the maximum sockets.')
    }

    config.maxSockets = max;
    // istanbul ignore else
    if (httpAgent) {
      httpAgent.destroy();
      httpAgent = null;
    }
    // istanbul ignore else
    if (httpsAgent) {
      httpsAgent.destroy();
      httpsAgent = null;
    }
  }
}

module.exports = sharedAgent;
