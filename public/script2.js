!function() {
  "use strict";
  
  (function(window) {
    const {
      screen: { width: screenWidth, height: screenHeight },
      navigator: { language, doNotTrack, msDoNotTrack },
      location,
      document,
      history,
      top,
      doNotTrack: globalDoNotTrack
    } = window;
    
    const { currentScript, referrer } = document;
    
    if (!currentScript) return;
    
    const { hostname, href, origin } = location;
    const localStorage = href.startsWith("data:") ? void 0 : window.localStorage;
    const dataPrefix = "data-";
    const trueValue = "true";
    const getAttribute = currentScript.getAttribute.bind(currentScript);
    
    const websiteId = getAttribute(dataPrefix + "website-id");
    const hostUrl = getAttribute(dataPrefix + "host-url");
    const beforeSend = getAttribute(dataPrefix + "before-send");
    const tag = getAttribute(dataPrefix + "tag") || void 0;
    const autoTrack = "false" !== getAttribute(dataPrefix + "auto-track");
    const respectDoNotTrack = getAttribute(dataPrefix + "do-not-track") === trueValue;
    const excludeSearch = getAttribute(dataPrefix + "exclude-search") === trueValue;
    const excludeHash = getAttribute(dataPrefix + "exclude-hash") === trueValue;
    const domains = getAttribute(dataPrefix + "domains") || "";
    const allowedDomains = domains.split(",").map(domain => domain.trim());
    
    const apiUrl = `${(hostUrl || "" || currentScript.src.split("/").slice(0, -1).join("/")).replace(/\/$/, "")}/api/send`;
    const screenSize = `${screenWidth}x${screenHeight}`;
    const eventRegex = /data-umami-event-([\w-_]+)/;
    const eventAttribute = dataPrefix + "umami-event";
    const delay = 300;
    
    const getPayload = () => ({
      website: websiteId,
      screen: screenSize,
      language,
      title: document.title,
      hostname,
      url: currentUrl,
      referrer: referrerUrl,
      tag,
      id: userId || void 0
    });
    
    const handleUrlChange = function(type, state, url) {
      if (url) {
        referrerUrl = currentUrl;
        currentUrl = new URL(url, location.href);
        
        if (excludeSearch) {
          currentUrl.search = "";
        }
        
        if (excludeHash) {
          currentUrl.hash = "";
        }
        
        currentUrl = currentUrl.toString();
        
        if (currentUrl !== referrerUrl) {
          setTimeout(track, delay);
        }
      }
    };
    
    const shouldSkip = () => {
      return isDisabled || 
             !websiteId || 
             (localStorage && localStorage.getItem("umami.disabled")) ||
             (domains && !allowedDomains.includes(hostname)) ||
             (autoTrack && (() => {
               const doNotTrackValue = globalDoNotTrack || doNotTrack || msDoNotTrack;
               return doNotTrackValue === 1 || doNotTrackValue === "1" || doNotTrackValue === "yes";
             })());
    };
    
    const send = async function(payload, type = "event") {
      if (shouldSkip()) return;
      
      const beforeSendFn = window[beforeSend];
      if (typeof beforeSendFn === "function") {
        payload = beforeSendFn(type, payload);
      }
      
      if (payload) {
        try {
          const response = await fetch(apiUrl, {
            keepalive: true,
            method: "POST",
            body: JSON.stringify({
              type: type,
              payload: payload
            }),
            headers: {
              "Content-Type": "application/json",
              ...(cacheKey !== void 0 && { "x-umami-cache": cacheKey })
            },
            credentials: "omit"
          });
          
          const result = await response.json();
          if (result) {
            isDisabled = !!result.disabled;
            cacheKey = result.cache;
          }
        } catch (error) {
          // Handle error silently
        }
      }
    };
    
    const init = function() {
      if (isInitialized) return;
      
      isInitialized = true;
      track();
      
      // Override history methods
      (function() {
        const override = function(obj, method, callback) {
          const original = obj[method];
          return function(...args) {
            callback.apply(null, args);
            original.apply(obj, args);
          };
        };
        
        history.pushState = override(history, "pushState", handleUrlChange);
        history.replaceState = override(history, "replaceState", handleUrlChange);
      })();
      
      // Add click event listener
      (function() {
        const handleClick = async function(element) {
          const eventName = element.getAttribute(eventAttribute);
          if (eventName) {
            const data = {};
            element.getAttributeNames().forEach(attr => {
              const match = attr.match(eventRegex);
              if (match) {
                data[match[1]] = element.getAttribute(attr);
              }
            });
            track(eventName, data);
          }
        };
        
        document.addEventListener("click", async function(event) {
          const target = event.target;
          const element = target.closest("a, button");
          
          if (!element) {
            return handleClick(target);
          }
          
          const { href, target: linkTarget } = element;
          
          if (element.getAttribute(eventAttribute)) {
            if (element.tagName === "BUTTON") {
              return handleClick(element);
            }
            
            if (element.tagName === "A" && href) {
              const isExternal = linkTarget === "_blank" || 
                                event.ctrlKey || 
                                event.shiftKey || 
                                event.metaKey || 
                                (event.button && event.button === 1);
              
              if (!isExternal) {
                event.preventDefault();
              }
              
              handleClick(element).then(() => {
                if (!isExternal) {
                  (linkTarget === "_top" ? top.location : location).href = href;
                }
              });
            }
          }
        }, true);
      })();
    };
    
    const track = function(eventName, data) {
      return send(
        typeof eventName === "string" 
          ? { ...getPayload(), name: eventName, data: data }
          : typeof eventName === "object" 
            ? { ...eventName }
            : typeof eventName === "function" 
              ? eventName(getPayload())
              : getPayload()
      );
    };
    
    const identify = function(id, data) {
      if (typeof id === "string") {
        userId = id;
      }
      cacheKey = "";
      send({
        ...getPayload(),
        data: typeof id === "object" ? id : data
      }, "identify");
    };
    
    if (!window.umami) {
      window.umami = {
        track: track,
        identify: identify
      };
    }
    
    let cacheKey;
    let userId;
    let currentUrl = href;
    let referrerUrl = referrer.startsWith(origin) ? "" : referrer;
    let isInitialized = false;
    let isDisabled = false;
    
    if (autoTrack && !shouldSkip()) {
      if (document.readyState === "complete") {
        init();
      } else {
        document.addEventListener("readystatechange", init, true);
      }
    }
  })(window);
}();