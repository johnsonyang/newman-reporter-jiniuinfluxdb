'use strict';

const querystring = require('querystring');
const axios = require('axios');
// const http = require('http')
const sharedAgent = require('./sharedAgent');

const keepAliveAgent = sharedAgent.http;

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