"use strict";

const { assert } = require("chai");
const { describe, specify } = require("mocha-sugar-free");

const jsdom = require("../../lib/old-api.js");
const { injectIFrame, injectIFrameWithScript, todo } = require("../util.js");

// Tests for window.postMessage(message, targetOrigin, transfer)
// Spec: https://html.spec.whatwg.org/#crossDocumentMessages

describe("post-message", () => {
  specify("throws SyntaxError on invalid targetOrigin", t => {
    const document = jsdom.jsdom();
    const window = document.defaultView;
    const iframe = injectIFrame(document);

    window.onload = () => {
      assert.throwsDomException(() => {
        iframe.contentWindow.postMessage("testMessage", "bogus targetOrigin");
      }, document, "SyntaxError");

      assert.throws(() => {
        iframe.contentWindow.postMessage("testMessage");
      }, TypeError);

      t.done();
    };
  }, {
    async: true
  });

  specify("postMessage from iframe to parent", t => {
    const document = jsdom.jsdom();
    const window = document.defaultView;
    const iframeWindow = injectIFrame(document).contentWindow;

    window.addEventListener("message", event => {
      assert.ok(event.data === "ack");
      assert.ok(event.type === "message");
      t.done();
    });

    iframeWindow.parent.postMessage("ack", "*");
  }, {
    async: true
  });

  specify("postMessage an object from iframe to parent", t => {
    const document = jsdom.jsdom();
    const window = document.defaultView;
    const iframeWindow = injectIFrame(document).contentWindow;

    window.addEventListener("message", event => {
      assert.ok(typeof event.data === "object");
      assert.ok(event.data.foo === "bar");
      assert.ok(event.type === "message");
      t.done();
    });

    iframeWindow.parent.postMessage({ foo: "bar" }, "*");
  }, {
    async: true
  });

  specify("postMessage from parent to iframe", t => {
    const document = jsdom.jsdom();
    const iframeWindow = injectIFrame(document).contentWindow;

    iframeWindow.addEventListener("message", event => {
      assert.ok(event.data === "ack");
      assert.ok(event.type === "message");
      t.done();
    });

    iframeWindow.postMessage("ack", "*");
  }, {
    async: true
  });

  specify("postMessage from iframe to iframe", t => {
    const document = jsdom.jsdom();
    const window = document.defaultView;

    window.iframeReceiver = injectIFrameWithScript(document, `
      window.addEventListener("message", event => {
        window.parent.postMessageEvent = event;
      });
    `);

    injectIFrameWithScript(document, `
      window.parent.iframeReceiver.contentWindow.postMessage("ack", "*");
    `);

    setTimeout(() => {
      assert.ok(window.postMessageEvent.type === "message");
      assert.ok(window.postMessageEvent.data === "ack");
      t.done();
    }, 0);
  }, {
    async: true
  });

  specify("postMessage silently rejects absolute URL targetOrigins", t => {
    const document = jsdom.jsdom();
    const window = document.defaultView;
    window.iframeReceiver = injectIFrame(document).contentWindow;
    window.iframeSender = injectIFrame(document).contentWindow;

    window.iframeReceiver.addEventListener("message", event => {
      window.iframeReceiver.parent.postMessageEvent = event;
    });

    window.iframeSender.parent.iframeReceiver.postMessage("ack", "https://github.com");

    setTimeout(() => {
      assert.ok(window.postMessageEvent === undefined);
      t.done();
    }, 0);
  }, {
    async: true
  });

  specify("postMessage respects '/' targetOrigin option", () => {
    todo(assert, tt => {
      // This would require knowledge of the source window
      // See: https://github.com/tmpvar/jsdom/pull/1140#issuecomment-111587499

      const document = jsdom.jsdom();
      const window = document.defaultView;
      window.iframeReceiver = injectIFrame(document);

      window.iframeReceiver.addEventListener("message", event => {
        tt.ok(event.type === "message");
        tt.ok(event.data === "ack");
        tt.done();
      });

      injectIFrameWithScript(document, `
        window.parent.iframeReceiver.contentWindow.postMessage("ack", "/");
      `);
    });
  });
});
