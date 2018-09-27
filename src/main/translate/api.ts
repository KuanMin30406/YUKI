const request = require("request");
import { Options, RequestCallback } from "request";
import { EventEmitter } from "events";

export default class Api extends EventEmitter {
  private config: Yagt.Config.OnlineApiItem;
  private requestOptions: Options;

  constructor(config: Yagt.Config.OnlineApiItem) {
    super();
    this.config = config;
    this.requestOptions = { url: "" };
    this.initRequestOptions();
  }

  initRequestOptions() {
    this.requestOptions = {
      url: this.config.url,
      method: this.config.method,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:62.0) Gecko/20100101 Firefox/62.0"
      }
    };
  }

  translate(text: string, callback: (translation: string) => void) {
    this.generateRequestBody(text);
    this.sendRequest((error, response, body) => {
      if (error || response.statusCode != 200) {
        throw new Error(
          `API [${this.config.name}]: ${response.statusCode} ${error}`
        );
      }
      let translation = this.parseResponse(body);
      callback(translation);
    });
  }

  private generateRequestBody(text: string) {
    let requestBodyString = this.config.requestBodyFormat.replace(
      "%TEXT%",
      `"${text}"`
    );
    if (this.config.requestBodyFormat.startsWith("X")) {
      this.requestOptions.form = JSON.parse(requestBodyString.substring(1));
    } else if (this.config.requestBodyFormat.startsWith("J")) {
      this.requestOptions.json = eval(requestBodyString.substring(1));
    } else {
      throw new Error(`API [${this.config.name}]: No such request body type`);
    }
  }

  private sendRequest(callback: RequestCallback) {
    request(this.requestOptions, callback);
  }

  private parseResponse(body: string): string {
    if (this.config.responseBodyPattern.startsWith("J")) {
      return this.parseResponseByJsObject(body);
    } else if (this.config.responseBodyPattern.startsWith("R")) {
      return this.parseResponseByRegExp(body);
    } else {
      throw new Error(
        `API [${this.config.name}]: No such response parser type`
      );
    }
  }

  private parseResponseByJsObject(body: string): string {
    let bodyObject = JSON.parse(body);
    let toEval = this.config.responseBodyPattern
      .substring(1)
      .replace("%RESPONSE%", "bodyObject");
    return eval(toEval);
  }

  private parseResponseByRegExp(body: string) {
    let pattern = new RegExp(this.config.responseBodyPattern.substring(1));
    let response = pattern.exec(body);
    if (response) {
      return response[1];
    } else {
      return "";
    }
  }

  isEnabled() {
    return this.config.enabled;
  }
}
