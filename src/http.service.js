'use strict';

const querystring = require('querystring');
const axios = require('axios');
const http = require('http')

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
const agentConfig = {
  keepAlive: true,
  keepAliveMsecs: 12000,
  maxSockets: 300,
  maxTotalSockets:600,
  maxFreeSockets:300,
  timeout:1500
};
const keepAliveAgent = new http.Agent(agentConfig);

// config的参数列表如下：
//     export interface AxiosRequestConfig {
//     url?: string;
//     method?: Method;
//     baseURL?: string;
//     transformRequest?: AxiosTransformer | AxiosTransformer[];
//     transformResponse?: AxiosTransformer | AxiosTransformer[];
//     headers?: any;
//     params?: any;
//     paramsSerializer?: (params: any) => string;
//     data?: any;
//     timeout?: number;
//     timeoutErrorMessage?: string;
//     withCredentials?: boolean;
//     adapter?: AxiosAdapter;
//     auth?: AxiosBasicCredentials;
//     responseType?: ResponseType;
//     xsrfCookieName?: string;
//     xsrfHeaderName?: string;
//     onUploadProgress?: (progressEvent: any) => void;
//     onDownloadProgress?: (progressEvent: any) => void;
//     maxContentLength?: number;
//     validateStatus?: ((status: number) => boolean) | null;
//     maxBodyLength?: number;
//     maxRedirects?: number;
//     socketPath?: string | null;
//     httpAgent?: any;
//     httpsAgent?: any;
//     proxy?: AxiosProxyConfig | false;
//     cancelToken?: CancelToken;
//     decompress?: boolean;
//   }
const axiosRequestConfig = {
  httpAgent: keepAliveAgent
};

class HttpService {

  constructor(context) {
    this.context = context;
  }



  // 构建db链接信息
  _buildInfluxDBUrl(path='write') {
    const url = `http://${this.context.server}:${this.context.port}/${path}`;
    const params = {
      db: this.context.name,
      u: this.context.username,
      p: this.context.password,
    };

    const paramsQuerystring = querystring.stringify(params);

    const connectionUrl = `${url}?${paramsQuerystring}`;
    return connectionUrl;
  }

  async healthCheck() {
    let connectionUrl = this._buildInfluxDBUrl('ping');

    try {
      const data = await axios.get(connectionUrl);
    } catch (error) {
      console.log('[-] ERROR: HTTP无法建立连接到InfluxDB', error);
    }
  }

  async sendData(data) {
    let connectionUrl = this._buildInfluxDBUrl();

    try {
      // note 使用示例
      // // Want to use async/await? Add the `async` keyword to your outer function/method.
      // async function getUser() {
      //   try {
      //     const response = await axios.get('/user?ID=12345');
      //     console.log(response);
      //   } catch (error) {
      //     console.error(error);
      //   }
      // }

      // note Request method aliases
      // axios.request(config)
      // axios.get(url[, config])
      // axios.delete(url[, config])
      // axios.head(url[, config])
      // axios.options(url[, config])
      // axios.post(url[, data[, config]])
      // axios.put(url[, data[, config]])
      // axios.patch(url[, data[, config]])
      // async/await is part of ECMAScript 2017 and is not supported in Internet Explorer and older browsers, so use with caution.
      // 发送数据记录给db，下面这个方法有很多选项，只有url是必须的，也就是下面的URL【connectionUrl】。。。
      // post<T = any, R = AxiosResponse<T>>(url: string, data?: any, config?: AxiosRequestConfig): Promise<R>;
      // axios.post(url[, data[, config]])

      // note 例子
      // const options = {
      //   headers: {'X-Custom-Header': 'value'}
      // };
      //
      // axios.post('/save', { a: 10 }, options);
      // 传递过来的data为：
      //   let binaryData = querystring.stringify(data, ',', '=', {encodeURIComponent: this._encodeURIComponent});
      //   // 此处是真正需要发送给时序数据库记录的数据
      //   // measurementName 是表名
      //   // binaryData 是相关tag和指标
      //   // value=${data.response_time} 这个就是value了
      //   binaryData = `${measurementName},${binaryData} value=${data.response_time}\n`;
      //   //TODO 还可以在记录其他的测量值
      //
      //   return binaryData;

      await axios.post(connectionUrl, data, axiosRequestConfig);
    } catch (error) {
      console.log('[-] ERROR: HTTP无法发送数据到InfluxDB', error);
    }
  }

  close() {
    
  }

};

module.exports = HttpService;