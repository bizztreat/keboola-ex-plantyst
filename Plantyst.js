var moment = require('./moment');

/** Plantyst SDK for JavaScript / TypeScript  */
var PLANTYST_SDK_VERSION = "0.2.25.0";
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
        /** Class used for managing cache values.
         */
        var CacheManagement = (function () {
            function CacheManagement(Configuration) {
                this.Configuration = Configuration;
            }
            /** Put given period into local storage. All data is saved in JSON format.
             * @param {string} key String combined with cache prefix. It is used to access data in local storage.
             * @param {(periods: T[]) => T[]): T[]} rempaPeriods Callback used to transform periods into list of periods that will be
             * stored in cache. There can be overlapping data in input, but there cannot be any overlapping data in output.
             * @return {T[]} Remapped periods.
             */
            CacheManagement.prototype.Put = function (key, period, remapPeriods) {
                var cacheKey = this.GetCacheKey(key);
                var cacheString = localStorage ? localStorage.getItem(cacheKey) : null;
                var cache = cacheString != null ? this.ParseCache(cacheString) : [];
                var intersectingPeriods = [];
                // use 2 non-intersecting arrays to keep cached periods ordered
                var nonIntersectingPeriodsBefore = [];
                var nonIntersectingPeriodsAfter = [];
                cache.forEach(function (p) {
                    if (p.To < period.From) {
                        nonIntersectingPeriodsBefore.push(p);
                    }
                    else if (p.From > period.To) {
                        nonIntersectingPeriodsAfter.push(p);
                    }
                    else {
                        intersectingPeriods.push(p);
                    }
                });
                var newPeriods = remapPeriods(intersectingPeriods.concat(period));
                cache = nonIntersectingPeriodsBefore.concat(newPeriods, nonIntersectingPeriodsAfter);
                cache.forEach(function (c) {
                    c.From.utc();
                    c.To.utc();
                });
                this.SaveToLocalStorage(cacheKey, JSON.stringify(cache));
                return newPeriods;
            };
            /** Get periods from local storage.
             * @param {string} key String combined with cache prefix. It is used to access data in local storage.
             * @param {moment.Moment} from Start of interval for which data should be returned.
             * @param {moment.Moment} from End of interval for which data should be returned.
             * @return {T[]} Cached periods that overlap with specified interval.
             */
            CacheManagement.prototype.Get = function (key, from, to) {
                if (!localStorage) {
                    return [];
                }
                var cacheKey = this.Configuration.LocalStoragePrefix + key;
                var cacheString = localStorage.getItem(cacheKey);
                if (cacheString == null) {
                    return [];
                }
                var cache = this.ParseCache(cacheString);
                return cache.filter(function (period) { return period.From <= to && period.To >= from; });
            };
            /** Clear all data from local storage, that have the configured local storage prefix.
             */
            CacheManagement.prototype.ClearAll = function () {
                if (!localStorage) {
                    return;
                }
                var cacheKey = this.Configuration.LocalStoragePrefix;
                for (var i in localStorage) {
                    if (i.indexOf(cacheKey) === 0) {
                        localStorage.removeItem(i);
                    }
                }
            };
            /** Save value to local storage. If local storage quota is exceeded, cache is cleared with ClearAll function.
             * If second attempt to save value fails to exceeded quota again, final result will be empty local storage.
             * @param {string} key Complete local storage key.
             * @param {string} value Value that should be cached.
             */
            CacheManagement.prototype.SaveToLocalStorage = function (key, value) {
                if (!this.Configuration.CacheWritingEnabled) {
                    return;
                }
                try {
                    localStorage.setItem(key, value);
                }
                catch (ex) {
                    this.ClearAll();
                    try {
                        localStorage.setItem(key, value);
                    }
                    catch (ex2) {
                        // do nothing
                    }
                }
            };
            /** Get final cache key.
             * @param {string} key String that will be combined with configured cache prefix.
             * @return {string} Final cache key that should be used to access local storage.
             */
            CacheManagement.prototype.GetCacheKey = function (key) {
                return this.Configuration.LocalStoragePrefix + key;
            };
            /** Parse periods from JSON string.
             * @param {string} cacheString String with serialized data from local storage.
             * @return {T[]} Periods array from given cache string.
             */
            CacheManagement.prototype.ParseCache = function (cacheString) {
                var cache = JSON.parse(cacheString);
                cache.forEach(function (period) {
                    period.From = moment.utc(period.From);
                    period.To = moment.utc(period.To);
                });
                return cache;
            };
            return CacheManagement;
        }());
        Data.CacheManagement = CacheManagement;
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
        /** Class used for managing global caching settings.
         */
        var CacheSetup = (function () {
            function CacheSetup() {
                /** Prefix for local storage variables.
                 */
                this.LocalStoragePrefix = "plantyst.";
                /** Flag indicating whether it is allowed to write to local storage.
                 */
                this.CacheWritingEnabled = true;
            }
            /** Get major version from data version string.
             */
            CacheSetup.GetMajorVersion = function (version) {
                return version && version.split(".")[0];
            };
            /** Check data version in cache. Clear cache if data version is different than expected.
             */
            CacheSetup.prototype.CheckDataVersion = function () {
                var _this = this;
                if (!localStorage) {
                    return;
                }
                var storageVersion;
                var versionChanged = false;
                try {
                    var storageVersionJson = localStorage && localStorage.getItem(this.LocalStoragePrefix + "dataVersion");
                    if (storageVersionJson) {
                        storageVersion = JSON.parse(storageVersionJson);
                    }
                }
                catch (ex) {
                    // ignore error
                }
                if (!storageVersion) {
                    storageVersion = {};
                }
                Object.keys(CacheSetup.DataVersion).forEach(function (key) {
                    var oldVersion = storageVersion[key];
                    var newVersion = CacheSetup.DataVersion[key];
                    if (CacheSetup.GetMajorVersion(oldVersion) !== CacheSetup.GetMajorVersion(newVersion)) {
                        versionChanged = true;
                        Object.keys(localStorage).forEach(function (lsKey) {
                            if (lsKey.lastIndexOf(_this.LocalStoragePrefix + key, 0) === 0) {
                                localStorage.removeItem(lsKey);
                            }
                        });
                    }
                });
                if (versionChanged) {
                    Data.Utils.SaveDataToCache(this.LocalStoragePrefix + "dataVersion", JSON.stringify(CacheSetup.DataVersion));
                }
            };
            return CacheSetup;
        }());
        /** Data versions.
         */
        CacheSetup.DataVersion = {
            "MTSA": "1.0",
            "MSTS": "1.0",
            "MSVS": "2.0",
            "measurements": "1.1",
            "subscriptions": "2.0",
            "downtimeCodes": "2.0"
        };
        Data.CacheSetup = CacheSetup;
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
        /** Basic implementation of communication bridge, that only proxies AJAX calls.
         */
        var CommunicationBridge = (function () {
            function CommunicationBridge() {
            }
            /** Returns new AJAX request.
             * @param {JQueryAjaxSettings} settings Settings that are passed to $.ajax. The passed object may be changed by this function.
             * @param claims Claims that may be sent in request, if bridge supports claims sending.
             * @return {JQueryXHR} AJAX request result.
             */
            CommunicationBridge.prototype.Ajax = function (settings, claims) {
                return $.ajax(settings);
            };
            /** Calls Ajax function with parameters indicating a JSON GET request. This is a helper function that should not be overriden.
             * @param {string} url Request url.
             * @param {any} data Request data.
             * @param claims Claims that may be sent in request, if bridge supports claims sending.
             * @return {JQueryXHR} AJAX request result.
             */
            CommunicationBridge.prototype.GetJSON = function (url, data, claims) {
                return this.Ajax({ url: url, data: data, dataType: "json" }, claims);
            };
            /** Calls Ajax function with parameters indicating a JSON POST request. This is a helper function that should not be overriden.
             * Sends data as JSON payload.
             * @param {string} url Request url.
             * @param {string} data Request data in JSON format.
             * @param claims Claims that may be sent in request, if bridge supports claims sending.
             * @return {JQueryXHR} AJAX request result.
             */
            CommunicationBridge.prototype.PostJSON = function (url, data, claims) {
                return this.Ajax({
                    url: url, data: data, dataType: "json", type: "POST",
                    contentType: "application/json"
                }, claims);
            };
            return CommunicationBridge;
        }());
        Data.CommunicationBridge = CommunicationBridge;
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
        /** Implementation of communication bridge, that uses JSON Web Token (JWT) for authorization.
         */
        var CommunicationBridgeBearer = (function (_super) {
            __extends(CommunicationBridgeBearer, _super);
            /** Creates new instance of communication bridge with specified parametrs.
             * @param Settings Parameters for generating JWT.
             */
            function CommunicationBridgeBearer(Token) {
                var _this = _super.call(this) || this;
                _this.Token = Token;
                return _this;
            }
            /** Returns new AJAX request. If claims are specified, authorization header is generated and added to request headers.
             * @param {JQueryAjaxSettings} settings Settings that are passed to $.ajax.
             * @param claims Claims that are used to generate JWT, if specified.
             * @return {JQueryXHR} AJAX request result.
             */
            CommunicationBridgeBearer.prototype.Ajax = function (settings, claims) {
                if (!settings.headers) {
                    settings.headers = {};
                }
                /* tslint:disable:no-string-literal */
                settings.headers["Authorization"] = "Token " + this.Token;
                /* tslint:enable */
                return $.ajax(settings);
            };
            return CommunicationBridgeBearer;
        }(Data.CommunicationBridge));
        Data.CommunicationBridgeBearer = CommunicationBridgeBearer;
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
        /** Implementation of communication bridge, that uses JSON Web Token (JWT) for authorization.
         */
        var CommunicationBridgeJWT = (function (_super) {
            __extends(CommunicationBridgeJWT, _super);
            /** Creates new instance of communication bridge with specified parametrs.
             * @param Settings Parameters for generating JWT.
             */
            function CommunicationBridgeJWT(Settings) {
                var _this = _super.call(this) || this;
                _this.Settings = Settings;
                if (!CryptoJS.HmacSHA256) {
                    throw Error("CryptoJS.HmacSHA256 not defined");
                }
                if (!CryptoJS.enc.Utf8) {
                    throw Error("CryptoJS.enc.Utf8 not defined");
                }
                if (!CryptoJS.enc.Base64) {
                    throw Error("CryptoJS.enc.Base64 not defined");
                }
                return _this;
            }
            /** Returns new AJAX request. If claims are specified, authorization header is generated and added to request headers.
             * @param {JQueryAjaxSettings} settings Settings that are passed to $.ajax.
             * @param claims Claims that are used to generate JWT, if specified.
             * @return {JQueryXHR} AJAX request result.
             */
            CommunicationBridgeJWT.prototype.Ajax = function (settings, claims) {
                if (!settings.headers) {
                    settings.headers = {};
                }
                /* tslint:disable:no-string-literal */
                settings.headers["Authorization"] = "Token " + this.GenerateAuthToken(claims || {});
                /* tslint:enable */
                return $.ajax(settings);
            };
            /** Provides time constraints for JWT. Returns current time interval from current time to one minute in future.
             * Returned values represent number of seconds from 1970-01-01T0:0:0Z UTC.
             * @param {JQueryAjaxSettings} settings Settings that are passed to $.ajax.
             * @param claims Claims that are used to generate JWT, if specified.
             * @return {JQueryXHR} AJAX request result.
             */
            CommunicationBridgeJWT.prototype.GetTimeConstraints = function () {
                var timeSeconds = moment().unix();
                return { From: timeSeconds, To: timeSeconds + 60 };
            };
            /** Generates JSON Web Token from settings and claims.
             * @param claims Request-specific Claims that are combined with rest of claims (issuer, audience, AccessKey, etc.).
             * @return {string} Returns JSON Web Token.
             */
            CommunicationBridgeJWT.prototype.GenerateAuthToken = function (claims) {
                var header = {
                    "typ": "JWT",
                    "alg": "HS256"
                };
                var timeConstraints = this.GetTimeConstraints();
                var claimsSet = $.extend({
                    "iss": this.Settings.Application,
                    "aud": CommunicationBridgeJWT.audience,
                    "nbf": timeConstraints.From,
                    "exp": timeConstraints.To,
                    "AccessKey": this.Settings.Key
                }, claims);
                var headerBase64 = CommunicationBridgeJWT.Base64ToUrlSafe(CryptoJS.enc.Utf8.parse(JSON.stringify(header)).toString(CryptoJS.enc.Base64));
                var claimsSetBase64 = CommunicationBridgeJWT.Base64ToUrlSafe(CryptoJS.enc.Utf8.parse(JSON.stringify(claimsSet)).toString(CryptoJS.enc.Base64));
                var messageBase64 = headerBase64 + "." + claimsSetBase64;
                var signatureBinary = CryptoJS.HmacSHA256(messageBase64, CryptoJS.enc.Base64.parse(this.Settings.Secret));
                var token = messageBase64 + "." + CommunicationBridgeJWT.Base64ToUrlSafe(signatureBinary.toString(CryptoJS.enc.Base64));
                return token;
            };
            /** Replaces URL-unsafe base64 characters in base64 string with URL-safe characters.
             * @param {string} input Any base64 string.
             * @return {string} Returns base64url encoded string.
             */
            CommunicationBridgeJWT.Base64ToUrlSafe = function (input) {
                return input
                    .replace(/\+/g, "-") // convert "+" to "-"
                    .replace(/\//g, "_") // convert "/" to "_"
                    .replace(/=+$/, ""); // remove ending "="
            };
            return CommunicationBridgeJWT;
        }(Data.CommunicationBridge));
        /** Audience of JWT.
         */
        CommunicationBridgeJWT.audience = "https://my.plantyst.com/";
        Data.CommunicationBridgeJWT = CommunicationBridgeJWT;
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
        /** Class used for managing communications.
         */
        var CommunicationSetup = (function () {
            function CommunicationSetup() {
            }
            return CommunicationSetup;
        }());
        /** Base API url.
         */
        CommunicationSetup.BaseApiUrl = "https://portal.plantyst.com/api/";
        /** SignalR url.
         */
        CommunicationSetup.SignalRUrl = "https://portal.plantyst.com/signalr";
        Data.CommunicationSetup = CommunicationSetup;
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
        /** Downtime codes provider.
         */
        var DowntimeCodesProvider = (function () {
            function DowntimeCodesProvider(bridge) {
                var _this = this;
                this.bridge = bridge;
                this.defaultCacheSetup = new Data.CacheSetup();
                /** Cache expiration duration.
                 */
                this.cacheExpiration = moment.duration(10, "days");
                /** Process queued items.
                 */
                this.ProcessItems = function (items) {
                    _this.SatisfyFromCache(items);
                    _this.SatisfyFromServer(items);
                };
                /** Request queue.
                 */
                this.queue = new Data.RequestQueue(1, this.ProcessItems);
            }
            Object.defineProperty(DowntimeCodesProvider.prototype, "url", {
                /** Server API URL.
                 */
                get: function () { return Data.CommunicationSetup.BaseApiUrl + "DowntimeDictionary"; },
                enumerable: true,
                configurable: true
            });
            /** Get local storage key for given measurement identifier.
             */
            DowntimeCodesProvider.prototype.GetLocalStorageKey = function (measurementId) {
                return this.defaultCacheSetup.LocalStoragePrefix + "downtimeCodes." +
                    measurementId.toString();
            };
            /** Fetch downtime codes for given measurement identifier and culture.
             */
            DowntimeCodesProvider.prototype.Fetch = function (measurementId, culture) {
                var result = $.Deferred();
                var promise = Plantyst.CancellableJQueryPromiseFromDeferred(result);
                this.queue.Push({
                    MeasurementId: measurementId,
                    Culture: culture,
                    Promise: promise,
                    Result: result
                });
                return promise;
            };
            /** Satisty queue items from cache.
             */
            DowntimeCodesProvider.prototype.SatisfyFromCache = function (items) {
                var _this = this;
                if (!localStorage) {
                    return;
                }
                items.forEach(function (item) {
                    if (item.Result.state() !== "pending") {
                        return;
                    }
                    var key = _this.GetLocalStorageKey(item.MeasurementId);
                    var stringData = localStorage.getItem(key);
                    if (!stringData) {
                        return;
                    }
                    var data = JSON.parse(stringData);
                    if (!data) {
                        return;
                    }
                    var cultureData = data[item.Culture];
                    if (!cultureData || moment(cultureData.FetchTime).add(_this.cacheExpiration) < moment()) {
                        return;
                    }
                    item.Result.resolve(cultureData.DowntimeCodes);
                });
            };
            /** Save downtime codes to cache.
             */
            DowntimeCodesProvider.prototype.SaveToCache = function (downtimeCodes, measurementId, culture) {
                if (!localStorage || !this.defaultCacheSetup.CacheWritingEnabled) {
                    return;
                }
                var key = this.GetLocalStorageKey(measurementId);
                var stringData = localStorage.getItem(key);
                var data = stringData && JSON.parse(stringData) || {};
                data[culture] = { DowntimeCodes: downtimeCodes, FetchTime: moment().format() };
                Data.Utils.SaveDataToCache(key, JSON.stringify(data));
            };
            /** Satisfy queue items from server.
             */
            DowntimeCodesProvider.prototype.SatisfyFromServer = function (items) {
                var _this = this;
                var itemsByCulture = {};
                items.forEach(function (item) {
                    if (item.Result.state() !== "pending") {
                        return;
                    }
                    var culture = itemsByCulture[item.Culture];
                    if (culture == null) {
                        itemsByCulture[item.Culture] = culture = [];
                    }
                    culture.push(item);
                });
                Object.keys(itemsByCulture).forEach(function (culture) {
                    var cultureItems = itemsByCulture[culture];
                    var measurementIds = Data.Utils.UniqueStringsOrNumbers(cultureItems.map(function (item) { return item.MeasurementId; }));
                    var request = _this.bridge.Ajax({
                        type: "GET",
                        url: _this.url,
                        data: { ids: measurementIds, culture: culture },
                        accepts: { "json": "application/hal+json" },
                        dataType: "json"
                    });
                    var groups = [];
                    var groupsDict = {};
                    cultureItems.forEach(function (item) {
                        var group = groupsDict[item.MeasurementId];
                        if (!group) {
                            group = { DowntimeCodes: [], Items: [], MeasurementId: item.MeasurementId };
                            groupsDict[item.MeasurementId] = group;
                            groups.push(group);
                        }
                        group.Items.push(item);
                    });
                    request.done(function (response) {
                        if (response &&
                            response._embedded &&
                            response._embedded.downtimeCode &&
                            response._embedded.measurementDowntimeCode) {
                            var downtimeCodesDict = {};
                            response._embedded.downtimeCode.forEach(function (p) { return downtimeCodesDict[p._links.self.href] = {
                                Code: p.key,
                                Title: p.code,
                                Description: p.title,
                                Order: p.order,
                                Severity: p.severity,
                                ValidTo: p.validTo
                            }; });
                            response._embedded.measurementDowntimeCode.forEach(function (result) {
                                var downtimeCodeLinks = result._links.downtimeCode;
                                var downtimeCodes = downtimeCodeLinks ? $.isArray(downtimeCodeLinks) ?
                                    downtimeCodeLinks.map(function (p) { return downtimeCodesDict[p.href]; }) :
                                    [downtimeCodesDict[downtimeCodeLinks.href]] :
                                    [];
                                var group = groupsDict[result.measurementId];
                                if (group) {
                                    group.DowntimeCodes = downtimeCodes;
                                }
                            });
                        }
                        groups.forEach(function (group) {
                            _this.SaveToCache(group.DowntimeCodes, group.MeasurementId, culture);
                            group.Items.forEach(function (item) { return item.Result.resolve(group.DowntimeCodes); });
                        });
                    });
                    request.fail(function () {
                        return cultureItems.forEach(function (item) { return item.Result.reject(); });
                    });
                });
            };
            return DowntimeCodesProvider;
        }());
        Data.DowntimeCodesProvider = DowntimeCodesProvider;
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        var DowntimeCodesSorter;
        (function (DowntimeCodesSorter) {
            "use strict";
            /** Sort the downtime codes.
             */
            function Sort(codes) {
                var codesWithOrder = [];
                var codesWithoutOrderAlphaDigit = [];
                var codesWithoutOrder = [];
                var alphaDigit = /^([a-zA-Z]*)(\d+)$/;
                codes.forEach(function (code) {
                    if (code.Order != null) {
                        codesWithOrder.push(code);
                    }
                    else if (alphaDigit.test(code.Code)) {
                        codesWithoutOrderAlphaDigit.push(code);
                    }
                    else {
                        codesWithoutOrder.push(code);
                    }
                });
                codesWithOrder.sort(function (a, b) { return a.Order - b.Order; });
                codesWithoutOrderAlphaDigit.sort(function (a, b) {
                    var ax = alphaDigit.exec(a.Code);
                    var bx = alphaDigit.exec(b.Code);
                    var c1 = Compare(ax[1], bx[1]);
                    if (c1 !== 0) {
                        return c1;
                    }
                    return Compare(parseInt(ax[2], 10), parseInt(bx[2], 10));
                });
                codesWithoutOrder.sort(function (a, b) {
                    return Compare(a.Code, b.Code);
                });
                return codesWithOrder.concat(codesWithoutOrderAlphaDigit, codesWithoutOrder);
            }
            DowntimeCodesSorter.Sort = Sort;
            function Compare(a, b) {
                if (a < b) {
                    return -1;
                }
                if (a > b) {
                    return 1;
                }
                return 0;
            }
        })(DowntimeCodesSorter = Data.DowntimeCodesSorter || (Data.DowntimeCodesSorter = {}));
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
        /** IntelliSense controller.
         */
        var IntelliSenseController = (function () {
            /** Construct new instance of IntelliSenseController.
             */
            function IntelliSenseController(Bridge) {
                var _this = this;
                this.Bridge = Bridge;
                /** Requests with their result deferreds.
                 */
                this.requests = {};
                Data.InitSignalR();
                if ($.connection.intelliSenseHub.client.process) {
                    throw "Only single instance of IntelliSenseController is allowed.";
                }
                $.connection.intelliSenseHub.client.process = function (requestId, type, results) {
                    results.forEach(function (r) { return r.Type = type; });
                    var request = _this.requests[requestId];
                    if (request) {
                        request.ReceivedCallbackCount++;
                        Data.Utils.PushArray(request.Results, results);
                        _this.Notify(request);
                    }
                };
                $.connection.hub.disconnected(function () {
                    Object.keys(_this.requests).forEach(function (requestId) { return _this.requests[requestId].Deferred.reject("disconnected"); });
                    _this.requests = {};
                });
            }
            Object.defineProperty(IntelliSenseController.prototype, "Url", {
                /** IntelliSense API URL.
                 */
                get: function () {
                    return Data.CommunicationSetup.BaseApiUrl + "IntelliSense";
                },
                enumerable: true,
                configurable: true
            });
            /** Notify or resolve the request result.
             */
            IntelliSenseController.prototype.Notify = function (request) {
                if (request.ReceivedCallbackCount === request.ExpectedCallbackCount) {
                    request.Deferred.resolve(request.Results);
                    delete this.requests[request.Id];
                }
                else {
                    request.Deferred.notify(request.Results);
                }
            };
            /** Fetch results matching the pattern.
             */
            IntelliSenseController.prototype.Fetch = function (pattern, searchType, measurementId) {
                var _this = this;
                var request = {
                    Deferred: $.Deferred(),
                    ExpectedCallbackCount: null,
                    ReceivedCallbackCount: 0,
                    Id: Data.Utils.NewGuid(),
                    Results: []
                };
                if ($.connection.hub.id == null) {
                    request.Deferred.reject("not connected");
                    return Plantyst.CancellableJQueryPromiseFromDeferred(request.Deferred);
                }
                this.requests[request.Id] = request;
                var xhr = this.Bridge.Ajax({
                    url: this.Url,
                    data: { pattern: pattern, clientId: $.connection.hub.id, requestId: request.Id, searchType: searchType, measurementId: measurementId }
                });
                xhr.done(function (response) {
                    if (response && response.results) {
                        request.ExpectedCallbackCount = response.results.length;
                        _this.Notify(request);
                    }
                    else {
                        delete _this.requests[request.Id];
                        request.Deferred.reject("invalid response");
                    }
                });
                xhr.fail(function () {
                    delete _this.requests[request.Id];
                    request.Deferred.reject("request failed");
                });
                request.Deferred.fail(function () {
                    delete _this.requests[request.Id];
                    xhr.abort("cancelled by user action");
                });
                return Plantyst.CancellableJQueryPromiseFromDeferred(request.Deferred);
            };
            return IntelliSenseController;
        }());
        Data.IntelliSenseController = IntelliSenseController;
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
        /** Measurement metrics provider.
         */
        var MultiQueryAjaxRequestHandler = (function () {
            /** Construct new instance of MeasurementMetricsProvider.
             */
            function MultiQueryAjaxRequestHandler(Bridge) {
                var _this = this;
                this.Bridge = Bridge;
                /** Queue for fetch requests.
                 */
                this.queue = new Data.RequestQueue(1, function (requests) { return _this.ProcessRequests(requests); });
                if (this.Bridge == null) {
                    this.Bridge = new Data.CommunicationBridge();
                }
            }
            /** Fetch results.
             */
            MultiQueryAjaxRequestHandler.prototype.Fetch = function (query) {
                var result = $.Deferred();
                var promise = Plantyst.CancellableJQueryPromiseFromDeferred(result);
                this.queue.Push({
                    Query: query,
                    Result: result,
                    Promise: promise,
                    QueryIdentifier: this.GetQueryIdentifier(query)
                });
                return promise;
            };
            /** Process queued fetch requests.
             */
            MultiQueryAjaxRequestHandler.prototype.ProcessRequests = function (requests) {
                var _this = this;
                var xhrData = JSON.stringify({
                    Queries: this.GetServerQueries(requests.map(function (r) { return r.Query; }))
                });
                var xhr = this.Bridge.Ajax({
                    type: "POST",
                    url: this.Url,
                    data: xhrData,
                    contentType: "application/json; charset=utf-8",
                    accepts: { "json": "application/json" },
                    dataType: "json"
                });
                requests.forEach(function (r) { return r.Result.fail(function () {
                    if (!requests.some(function (r) { return r.Promise.state() === "pending"; }) && xhr.state() === "pending") {
                        xhr.abort();
                    }
                }); });
                xhr.done(function (response) {
                    _this.HandleXhrDone(requests, response);
                });
            };
            /** Handle server API response.
             */
            MultiQueryAjaxRequestHandler.prototype.HandleXhrDone = function (requests, response) {
                var _this = this;
                var resultsDict = {};
                var results = this.GetResults(response);
                results.forEach(function (r) {
                    resultsDict[_this.GetQueryIdentifier(r.Query)] = r.Result;
                });
                requests.forEach(function (request) {
                    var result = resultsDict[request.QueryIdentifier];
                    if (result) {
                        request.Result.resolve(result);
                    }
                    else {
                        request.Result.reject("Server did not return requested data.");
                    }
                });
            };
            Object.defineProperty(MultiQueryAjaxRequestHandler.prototype, "Url", {
                /** Server API URL.
                 */
                get: function () {
                    throw new Error("not implemented");
                },
                enumerable: true,
                configurable: true
            });
            /** Generate query identifier. Used for pairing fetch requests with server responses and for filtering duplicate queries.
             */
            MultiQueryAjaxRequestHandler.prototype.GetQueryIdentifier = function (q) {
                throw new Error("not implemented");
            };
            /** Get query that can be sent to server.
             */
            MultiQueryAjaxRequestHandler.prototype.GetServerQuery = function (query) {
                throw new Error("not implemented");
            };
            /** Get queries that can be sent to server.
             * Default implementation maps queries to server queries using GetServerQuery method and
             * duplicate queries using identifiers from GetQueryIdentifier.
             */
            MultiQueryAjaxRequestHandler.prototype.GetServerQueries = function (queries) {
                var _this = this;
                var queriesDict = {};
                queries.forEach(function (q) {
                    queriesDict[_this.GetQueryIdentifier(q)] = q;
                });
                var filteredQueries = Object.keys(queriesDict).map(function (queryId) { return queriesDict[queryId]; });
                return filteredQueries.map(this.GetServerQuery);
            };
            /** Get results from server response.
             */
            MultiQueryAjaxRequestHandler.prototype.GetResults = function (response) {
                throw new Error("not implemented");
            };
            return MultiQueryAjaxRequestHandler;
        }());
        Data.MultiQueryAjaxRequestHandler = MultiQueryAjaxRequestHandler;
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
/// <reference path="MultiQueryAjaxRequestHandler.ts" />
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
        /** Measurement metrics provider.
         */
        var MeasurementMetricsProvider = (function (_super) {
            __extends(MeasurementMetricsProvider, _super);
            function MeasurementMetricsProvider() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            Object.defineProperty(MeasurementMetricsProvider.prototype, "Url", {
                /** Server API URL.
                 */
                get: function () {
                    return Data.CommunicationSetup.BaseApiUrl + "MeasurementMetricsQuery";
                },
                enumerable: true,
                configurable: true
            });
            /** Generate query identifier. Used for pairing fetch requests with server responses.
             */
            MeasurementMetricsProvider.prototype.GetQueryIdentifier = function (q) {
                var timeFormat = "YYYYMMDDHHmmss";
                return q.MeasurementId.toString() + "." +
                    q.From.clone().utc().format(timeFormat) + "." +
                    q.To.clone().utc().format(timeFormat) + "." +
                    q.MaximumCount.toString();
            };
            /** Get queries that can be sent to server.
             */
            MeasurementMetricsProvider.prototype.GetServerQuery = function (q) {
                return {
                    measurementId: q.MeasurementId,
                    from: q.From.utc().format("YYYY-MM-DDTHH:mm:ss[Z]"),
                    to: q.To.utc().format("YYYY-MM-DDTHH:mm:ss[Z]"),
                    maximumCount: q.MaximumCount
                };
            };
            /** Get results from server response.
             */
            MeasurementMetricsProvider.prototype.GetResults = function (response) {
                return response.results && response.results.map(function (result) {
                    var query = {
                        MeasurementId: result.query.measurementId,
                        From: moment(result.query.from),
                        To: moment(result.query.to),
                        MaximumCount: result.query.maximumCount
                    };
                    var results = result.results
                        .map(function (metric) { return ({ Name: metric.name, Value: metric.value }); });
                    return { Query: query, Result: results };
                });
            };
            return MeasurementMetricsProvider;
        }(Data.MultiQueryAjaxRequestHandler));
        Data.MeasurementMetricsProvider = MeasurementMetricsProvider;
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
/// <reference path="MultiQueryAjaxRequestHandler.ts" />
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
        /** Measurement metrics quota provider.
         */
        var MeasurementMetricsQuotaProvider = (function (_super) {
            __extends(MeasurementMetricsQuotaProvider, _super);
            function MeasurementMetricsQuotaProvider() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            Object.defineProperty(MeasurementMetricsQuotaProvider.prototype, "Url", {
                /** Server API URL.
                 */
                get: function () {
                    return Data.CommunicationSetup.BaseApiUrl + "MeasurementMetricQuotasQuery";
                },
                enumerable: true,
                configurable: true
            });
            /** Generate query identifier. Used for pairing fetch requests with server responses.
             */
            MeasurementMetricsQuotaProvider.prototype.GetQueryIdentifier = function (q) {
                var timeFormat = "YYYYMMDDHHmmss";
                return q.MeasurementId.toString() + "." +
                    q.From.clone().utc().format(timeFormat) + "." +
                    q.To.clone().utc().format(timeFormat) + "." +
                    q.MetricName;
            };
            /** Get query that can be sent to server.
             */
            MeasurementMetricsQuotaProvider.prototype.GetServerQuery = function (q) {
                return {
                    measurementId: q.MeasurementId,
                    from: q.From.utc().format("YYYY-MM-DDTHH:mm:ss[Z]"),
                    to: q.To.utc().format("YYYY-MM-DDTHH:mm:ss[Z]"),
                    metricName: q.MetricName
                };
            };
            /** Get results from server response.
             */
            MeasurementMetricsQuotaProvider.prototype.GetResults = function (response) {
                return response.results && response.results.map(function (result) {
                    var query = {
                        MeasurementId: result.query.measurementId,
                        From: moment(result.query.from),
                        To: moment(result.query.to),
                        MetricName: result.query.metricName
                    };
                    var results = {
                        TotalQuota: result.result.totalQuota
                    };
                    return { Query: query, Result: results };
                });
            };
            return MeasurementMetricsQuotaProvider;
        }(Data.MultiQueryAjaxRequestHandler));
        Data.MeasurementMetricsQuotaProvider = MeasurementMetricsQuotaProvider;
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
/// <reference path="measurementmetricsquotaprovider.ts" />
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
        /** Measurement metrics quota provider.
         */
        var MeasurementMetricsQuotaController = (function (_super) {
            __extends(MeasurementMetricsQuotaController, _super);
            function MeasurementMetricsQuotaController(bridge) {
                var _this = _super.call(this, bridge) || this;
                _this.bridge = bridge;
                return _this;
            }
            Object.defineProperty(MeasurementMetricsQuotaController.prototype, "SetUrl", {
                /** Server API URL for changing the quota.
                 */
                get: function () {
                    return Data.CommunicationSetup.BaseApiUrl + "MeasurementMetricQuotas";
                },
                enumerable: true,
                configurable: true
            });
            /** Set measurement metric quota.
             */
            MeasurementMetricsQuotaController.prototype.SetQuota = function (measurementId, from, timespan, metricName, value) {
                var xhr = this.bridge.Ajax({
                    type: "POST",
                    url: this.SetUrl,
                    contentType: "application/json; charset=utf-8",
                    data: JSON.stringify({
                        measurementId: measurementId,
                        from: from.clone().utc().format("YYYY-MM-DDTHH:mm:ss[Z]"),
                        timespan: timespan,
                        metricName: metricName,
                        value: value
                    })
                });
                return Plantyst.CancellableJQueryPromiseFromPromise(xhr, function () { return xhr.abort(); });
            };
            return MeasurementMetricsQuotaController;
        }(Data.MeasurementMetricsQuotaProvider));
        Data.MeasurementMetricsQuotaController = MeasurementMetricsQuotaController;
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
        /** Measurement provider class.
         */
        var MeasurementProvider = (function () {
            /** Create new instance of MeasurementProvider.
             * @param {CommunicationBridge} Bridge - a communication bridge to server access.
             */
            function MeasurementProvider(Bridge) {
                this.Bridge = Bridge;
                /** Cache setup.
                 */
                this.CacheSetup = new Data.CacheSetup();
                if (this.Bridge == null) {
                    this.Bridge = new Data.CommunicationBridge();
                }
            }
            Object.defineProperty(MeasurementProvider.prototype, "Url", {
                /** Measurement API URL.
                 */
                get: function () {
                    return Data.CommunicationSetup.BaseApiUrl + "Measurements";
                },
                enumerable: true,
                configurable: true
            });
            /** Fetch Measurements
             * @Param {string} userId - identifier used as a local storage key.
             * @Return {JQueryPromise<Measurement[]>} jQuery promis of Measurement[] data type.
             * @Note: jQuery promise returns progress with cached value of Measurements.
             */
            MeasurementProvider.prototype.Fetch = function (UserId) {
                var _this = this;
                var deferred = $.Deferred();
                var isInCache = false;
                // try fetch data from the local storage
                if (typeof (Storage) !== "undefined") {
                    var storageKey = this.CacheSetup.LocalStoragePrefix + MeasurementProvider.localStorageKey;
                    var cacheMeasurements = localStorage.getItem(storageKey + UserId);
                    if (cacheMeasurements) {
                        var measurements = JSON.parse(cacheMeasurements);
                        deferred.notify(measurements);
                        isInCache = true;
                    }
                }
                // call server
                if (isInCache) {
                    setTimeout(function () { return _this.CallServer(deferred, UserId); }, 5); // postpone server call.
                }
                else {
                    this.CallServer(deferred, UserId);
                }
                return deferred;
            };
            /** AJAX server call.
             * @param {JQueryDeferred<Measurement[]>} deffered - into the result will be reported.
             * @Param {string} userId - identifier used as a local storage key.
             */
            MeasurementProvider.prototype.CallServer = function (deferred, UserId) {
                var _this = this;
                this.Bridge
                    .Ajax({
                    url: this.Url,
                    dataType: "json",
                    headers: { "Accept": "application/hal+json" }
                })
                    .then(function (response) {
                    var serverTimezonesDictionary = {};
                    if (response._embedded && response._embedded.timezone) {
                        response._embedded.timezone.forEach(function (zone) {
                            if (zone._links) {
                                serverTimezonesDictionary[zone._links.self.href] = {
                                    Id: zone.id,
                                    Name: zone.name,
                                    IanaName: zone.iana
                                };
                            }
                        });
                    }
                    var serverTagsDictionary = {};
                    if (response._embedded && response._embedded.tag) {
                        response._embedded.tag.forEach(function (tag) {
                            serverTagsDictionary[tag._links.self.href] = {
                                Id: tag.id,
                                Title: tag.title,
                                Color: tag.color
                            };
                        });
                    }
                    var serverDataVersionsDictionary = {};
                    if (response._embedded && response._embedded.measurementDataVersion) {
                        response._embedded.measurementDataVersion.forEach(function (v) {
                            serverDataVersionsDictionary[v._links.self.href] = {
                                Title: v.title,
                                LastModified: v.lastModified
                            };
                        });
                    }
                    var serverMeasurements = [];
                    if (response._embedded && response._embedded.measurement) {
                        serverMeasurements = response._embedded.measurement.map(function (m) {
                            var timezone = null;
                            if (m._links &&
                                m._links.timezone &&
                                serverTimezonesDictionary.hasOwnProperty(m._links.timezone.href)) {
                                timezone = serverTimezonesDictionary[m._links.timezone.href];
                            }
                            var tags = m._links.tags && (m._links.tags instanceof Array ?
                                m._links.tags.map(function (tag) { return serverTagsDictionary[tag.href]; }) :
                                [serverTagsDictionary[m._links.tags.href]]);
                            var dataVersions = m._links.dataVersions && (m._links.dataVersions instanceof Array ?
                                m._links.dataVersions.map(function (v) { return serverDataVersionsDictionary[v.href]; }) :
                                [serverDataVersionsDictionary[m._links.dataVersions.href]]);
                            return {
                                MeasurementId: m.measurementId,
                                Title: m.title,
                                TimeZone: timezone,
                                AccessRights: m.rights,
                                QuantityType: m.quantityType,
                                Tags: tags,
                                First: m.first,
                                Description: m.description,
                                DataVersions: dataVersions
                            };
                        });
                    }
                    // store measurements to the local storage
                    if (typeof (Storage) !== "undefined" && _this.CacheSetup.CacheWritingEnabled) {
                        var storageKey = _this.CacheSetup.LocalStoragePrefix + MeasurementProvider.localStorageKey + UserId;
                        Data.Utils.SaveDataToCache(storageKey, JSON.stringify(serverMeasurements));
                    }
                    // resolve deferred.
                    deferred.resolve(serverMeasurements);
                }, function () { deferred.reject(); });
            };
            return MeasurementProvider;
        }());
        /** Local storage measurement key.
         */
        MeasurementProvider.localStorageKey = "measurements.";
        Data.MeasurementProvider = MeasurementProvider;
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
        /** MeasurementStateSum implementation.
         */
        var MeasurementStateSum = (function () {
            function MeasurementStateSum(data) {
                this.Day = moment.utc(data.time);
            }
            return MeasurementStateSum;
        }());
        Data.MeasurementStateSum = MeasurementStateSum;
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
        /** MeasurementStateSum data provider.
         */
        var MeasurementStateSumDataProvider = (function () {
            /** Create new instance.
             * @param config Configuration of the provider.
             */
            function MeasurementStateSumDataProvider(config) {
                var _this = this;
                this.config = config;
                /** Queue used for queuing fetch requests.
                 */
                this.queue = new Data.RequestQueue(1, function (items) { return _this.ProcessQueueItems(items); });
            }
            Object.defineProperty(MeasurementStateSumDataProvider.prototype, "Url", {
                /** Url for server request. Must be overriden.
                 */
                get: function () {
                    throw new Error("not implemented");
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(MeasurementStateSumDataProvider.prototype, "CachePrefix", {
                /** Cache prefix. Must be overriden.
                 */
                get: function () {
                    throw new Error("not implemented");
                },
                enumerable: true,
                configurable: true
            });
            /** Fetch data for specified query.
             * @param query Query determining data to fetch from the
             * @return Promise of returned data.
             */
            MeasurementStateSumDataProvider.prototype.Fetch = function (query) {
                var deferred = $.Deferred();
                var queueItem = {
                    Promise: deferred.promise(),
                    Result: deferred,
                    Query: query
                };
                if (!query.To.isAfter(query.From)) {
                    throw "Invalid query: To is not after From";
                }
                this.queue.Push(queueItem);
                return queueItem.Promise;
            };
            /** Cancel data request, that was previously created by calling Fetch.
             * @param promise A promise identifying the request.
             * @return Returns true if item was successfuly removed from queue. Otherwise returns false.
             */
            MeasurementStateSumDataProvider.prototype.Cancel = function (promise) {
                var item = this.queue.Get(promise);
                if (item == null) {
                    return false;
                }
                item.Result.reject({ Message: "Canceled by user." });
                return true;
            };
            /** Process queued items.
             */
            MeasurementStateSumDataProvider.prototype.ProcessQueueItems = function (items) {
                var fetchItems = this.ConvertQueueItemsToFetchItems(items);
                var cacheKeys = this.GetCacheKeys(fetchItems);
                this.ApplyCachedData(cacheKeys);
                this.ResolveItems(fetchItems, false);
                fetchItems = fetchItems.filter(function (item) { return !item.IsHandled; });
                if (fetchItems.length === 0) {
                    return;
                }
                var incompleteCacheKeys = this.config.CacheSetup.CacheWritingEnabled ?
                    cacheKeys.filter(function (key) { return !key.LoadedData || key.LoadedData.DataRange.To.isBefore(key.KeyRange.To); }) : [];
                this.LoadAndProcessDataFromServer(fetchItems, incompleteCacheKeys);
            };
            /** Generate all cache keys from fetch items and cached data.
             * @returns All keys, even keys without cached data.
             */
            MeasurementStateSumDataProvider.prototype.GetCacheKeys = function (items) {
                var _this = this;
                var keys = Data.Utils.GetCacheKeys(items.map(function (item) { return ({
                    Item: item,
                    DataRanges: item.MissingDataRanges,
                    CacheKeyDuration: MeasurementStateSumDataProvider.cacheKeyDuration
                }); }), function (item, from) { return item.CacheKeyBase + from.format(MeasurementStateSumDataProvider.cacheKeyDateFormat); });
                var knownDataStart = {};
                var keysWithData = Object.keys(keys).map(function (keyId) {
                    var key = keys[keyId];
                    var keyItem = key.Items[0];
                    var data = _this.LoadCacheKeyFromCache(keyId, MeasurementStateSumDataProvider.pointDuration, key.Range.From);
                    var cacheKey = {
                        KeyId: keyId,
                        Data: data ? { Data: data.RawData.Data, DataRange: { From: data.RawData.DataRange.From, To: key.Range.To } } : null,
                        LoadedData: data ? data.TransformedData : null,
                        Items: key.Items,
                        KeyRange: key.Range,
                        QueryBase: keyItem.Query,
                        IsModified: false
                    };
                    if (data && data.TransformedData.DataRange.From.isAfter(key.Range.From)) {
                        knownDataStart[keyItem.CacheKeyBase] = data.TransformedData.DataRange.From;
                    }
                    return cacheKey;
                });
                return keysWithData.filter(function (key) {
                    var dataStart = knownDataStart[key.Items[0].CacheKeyBase];
                    return !dataStart || key.KeyRange.To.isAfter(dataStart);
                });
            };
            /** Load and process data from server.
             */
            MeasurementStateSumDataProvider.prototype.LoadAndProcessDataFromServer = function (fetchItems, incompleteCacheKeys) {
                var _this = this;
                var aggregableCacheKeys = incompleteCacheKeys.map(function (key) { return ({
                    Item: { FetchItem: null, CacheKey: key, QueryBase: key.QueryBase },
                    AggregableKey: key.Items[0].CacheKeyBase,
                    Ranges: [key.LoadedData ? { From: key.LoadedData.DataRange.To, To: key.KeyRange.To } : key.KeyRange]
                }); });
                var aggregableFetchItems = fetchItems.map(function (item) { return ({
                    Item: { FetchItem: item, CacheKey: null, QueryBase: item.Query },
                    AggregableKey: item.CacheKeyBase,
                    Ranges: item.MissingDataRanges
                }); });
                var aggregatedRanges = Data.Utils.AggregateTimeRanges(aggregableCacheKeys.concat(aggregableFetchItems));
                var queriesMap = {};
                var serverQueries = [];
                aggregatedRanges.forEach(function (range) {
                    var queryBase = range.AggregatedItems[0].QueryBase;
                    var serverQueryId = _this.GetQueryIdentifier({
                        MeasurementId: queryBase.MeasurementId,
                        From: range.AggregatedRange.From,
                        To: range.AggregatedRange.To
                    });
                    queriesMap[serverQueryId] = range.AggregatedItems;
                    var serverQuery = {
                        measurementId: queryBase.MeasurementId,
                        from: range.AggregatedRange.From.format("YYYY-MM-DDTHH:mm:ss[Z]"),
                        to: range.AggregatedRange.To.format("YYYY-MM-DDTHH:mm:ss[Z]")
                    };
                    serverQueries.push(serverQuery);
                });
                this.ProcessDataFromServer(serverQueries, queriesMap, fetchItems, incompleteCacheKeys);
            };
            /** Process data from server.
             */
            MeasurementStateSumDataProvider.prototype.ProcessDataFromServer = function (serverQueries, queriesMap, fetchItems, incompleteCacheKeys) {
                var _this = this;
                var xhr = this.config.Bridge.Ajax({
                    type: "POST",
                    url: this.Url,
                    data: JSON.stringify({ Queries: serverQueries }),
                    contentType: "application/json; charset=utf-8",
                    accepts: { "json": "application/json" },
                    dataType: "json"
                }, { "variableId": "[" + serverQueries.map(function (query) { return query.measurementId; }).toString() + "]" });
                xhr.done(function (response) {
                    _this.ApplyServerResponse(response, queriesMap);
                    _this.SaveCacheKeysToCache(incompleteCacheKeys);
                    _this.ResolveItems(fetchItems, true);
                });
                xhr.fail(function () {
                    fetchItems.forEach(function (item) {
                        if (item.IsHandled) {
                            return;
                        }
                        item.Result.reject();
                    });
                });
                fetchItems.forEach(function (item) {
                    item.Result.fail(function () {
                        if (fetchItems.every(function (item) { return item.IsHandled; })) {
                            xhr.abort();
                        }
                    });
                });
            };
            /** Save caches key to cache.
             */
            MeasurementStateSumDataProvider.prototype.SaveCacheKeysToCache = function (cacheKeys) {
                var _this = this;
                cacheKeys.forEach(function (key) {
                    if (!key.IsModified) {
                        return;
                    }
                    _this.SaveCacheKeyToCache(key);
                });
            };
            /** Save cache key to cache. Clear cache if save fails.
             */
            MeasurementStateSumDataProvider.prototype.SaveCacheKeyToCache = function (key) {
                var keyData = {
                    Data: key.Data.Data
                };
                var keyDataString = JSON.stringify(keyData);
                Data.Utils.SaveDataToCache(key.KeyId, keyDataString);
                key.IsModified = false;
            };
            /** Generate cache key base from measurement identifier and view cache key name.
             */
            MeasurementStateSumDataProvider.prototype.GetCacheKeyBase = function (measurementId) {
                return this.config.CacheSetup.LocalStoragePrefix +
                    this.CachePrefix +
                    measurementId + ".";
            };
            /** Apply server response to fetch items and cache keys.
             */
            MeasurementStateSumDataProvider.prototype.ApplyServerResponse = function (response, queriesMap) {
                var _this = this;
                if (!response || !response.results) {
                    return;
                }
                response.results.forEach(function (result) {
                    var rawData = result.result;
                    var data = rawData ? _this.TransformData(rawData) : [];
                    if (data.length === 0) {
                        return;
                    }
                    var from = data[0].Day;
                    var pointDuration = MeasurementStateSumDataProvider.pointDuration;
                    var to = data[data.length - 1].Day.clone().add(pointDuration);
                    var query = {
                        MeasurementId: result.query.measurementId,
                        From: moment.utc(result.query.from),
                        To: moment.utc(result.query.to)
                    };
                    var serverQueryId = _this.GetQueryIdentifier(query);
                    var queryItems = queriesMap[serverQueryId];
                    queryItems.forEach(function (item) {
                        if (item.CacheKey) {
                            _this.MergeDataWithCacheKey(item.CacheKey, {
                                Data: rawData,
                                DataRange: { From: from, To: to }
                            }, query);
                        }
                        if (item.FetchItem) {
                            _this.MergeDataWithFetchItem(item.FetchItem, {
                                Data: data,
                                DataRange: { From: from, To: to }
                            }, query);
                        }
                    });
                });
            };
            /** Apply cached data to fetch items.
             */
            MeasurementStateSumDataProvider.prototype.ApplyCachedData = function (cachedKeys) {
                var _this = this;
                cachedKeys.forEach(function (key) {
                    var data = key.LoadedData;
                    if (!data) {
                        return;
                    }
                    key.Items.forEach(function (item) {
                        _this.MergeDataWithFetchItem(item, data, key.KeyRange);
                        item.IsNotified = false;
                    });
                });
            };
            /** Resolve fetch items. Only unhandled items without missing ranges are resolved.
             */
            MeasurementStateSumDataProvider.prototype.ResolveItems = function (items, final) {
                var _this = this;
                items.forEach(function (item) {
                    if (item.IsHandled) {
                        return;
                    }
                    if (_this.IsFetchItemResolvable(item, final)) {
                        item.Result.resolve(_this.CreateResult(item));
                    }
                    else if (!item.IsNotified) {
                        item.Result.notify(_this.CreateResult(item));
                    }
                    if (final && !item.IsHandled) {
                        item.Result.reject("failed to fetch data");
                    }
                });
            };
            /** Create result for fetch item.
             */
            MeasurementStateSumDataProvider.prototype.CreateResult = function (item) {
                return item.Data;
            };
            /** Convert queue items to fetch items.
             */
            MeasurementStateSumDataProvider.prototype.ConvertQueueItemsToFetchItems = function (items) {
                var _this = this;
                return items.map(function (item, index) {
                    var dataTimeRange = Data.Utils.AlignTimeRangeToMs(item.Query, MeasurementStateSumDataProvider.pointDuration);
                    var cacheKeyBase = _this.GetCacheKeyBase(item.Query.MeasurementId);
                    var fetchItem = {
                        Query: item.Query,
                        Result: item.Result,
                        Data: [],
                        DataRange: dataTimeRange,
                        MissingDataRanges: [{ From: dataTimeRange.From, To: dataTimeRange.To }],
                        CacheKeyBase: cacheKeyBase,
                        IsHandled: false,
                        IsNotified: true
                    };
                    fetchItem.Result.always(function () { return fetchItem.IsHandled = true; });
                    fetchItem.Result.progress(function () { return fetchItem.IsNotified = true; });
                    return fetchItem;
                });
            };
            /** Check if fetch item is resolvable.
             */
            MeasurementStateSumDataProvider.prototype.IsFetchItemResolvable = function (item, final) {
                if (item.MissingDataRanges.length === 0) {
                    return true;
                }
                if (final && item.MissingDataRanges.every(function (range) { return range.To.isSame(item.DataRange.To); })) {
                    return true;
                }
                return false;
            };
            /** Merge data with fetch item.
             */
            MeasurementStateSumDataProvider.prototype.MergeDataWithFetchItem = function (item, data, dataRequestedRange) {
                var pointDuration = MeasurementStateSumDataProvider.pointDuration;
                var merged = Data.Utils.MergeData(item.Data, item.DataRange, data.Data, data.DataRange, 1, pointDuration, dataRequestedRange.From, item.DataRange.From);
                if (!merged) {
                    // todo: log possible error
                    return false;
                }
                item.MissingDataRanges = Data.Utils.GetTimeRangesDifference(item.MissingDataRanges, merged);
                return true;
            };
            /** Merge data with cache key.
             */
            MeasurementStateSumDataProvider.prototype.MergeDataWithCacheKey = function (key, data, dataRequestedRange) {
                if (!key.Data) {
                    var dataRangeUnion = Data.Utils.GetTimeRangeUnion(data.DataRange, key.KeyRange);
                    if (!dataRangeUnion) {
                        return false;
                    }
                    key.Data = {
                        Data: [],
                        DataRange: dataRangeUnion
                    };
                }
                var pointDuration = MeasurementStateSumDataProvider.pointDuration;
                var merged = Data.Utils.MergeData(key.Data.Data, key.Data.DataRange, data.Data, data.DataRange, 1, pointDuration, dataRequestedRange.From, key.KeyRange.From);
                if (!merged) {
                    // todo: log possible error
                    return false;
                }
                key.IsModified = key.IsModified || !!merged;
                return true;
            };
            /** Load cache key from cache.
             */
            MeasurementStateSumDataProvider.prototype.LoadCacheKeyFromCache = function (keyId, pointDuration, keyFrom) {
                if (!localStorage) {
                    return null;
                }
                var dataRaw = localStorage.getItem(keyId);
                if (!dataRaw) {
                    return null;
                }
                var dataParsed = JSON.parse(dataRaw);
                var finalData = this.TransformData(dataParsed.Data);
                var range = { From: finalData[0].Day, To: finalData[finalData.length - 1].Day.clone().add(pointDuration) };
                return {
                    RawData: {
                        Data: dataParsed.Data,
                        DataRange: range
                    },
                    TransformedData: {
                        Data: finalData,
                        DataRange: range
                    }
                };
            };
            /** Generate query identifier. Used for pairing fetch requests with server responses.
             */
            MeasurementStateSumDataProvider.prototype.GetQueryIdentifier = function (q) {
                var timeFormat = "YYYYMMDDHHmmss";
                return q.MeasurementId.toString() + "." +
                    q.From.clone().utc().format(timeFormat) + "." +
                    q.To.clone().utc().format(timeFormat);
            };
            /** Transforms raw data into user friendly data. Must be overriden.
             */
            MeasurementStateSumDataProvider.prototype.TransformData = function (data) {
                throw new Error("not implemented");
            };
            return MeasurementStateSumDataProvider;
        }());
        /** Point duration. Equals to one day in milliseconds.
         */
        MeasurementStateSumDataProvider.pointDuration = moment.duration(1, "day").asMilliseconds();
        /** Cache key duration. Equals to "year".
         */
        MeasurementStateSumDataProvider.cacheKeyDuration = "year";
        /** Cache key date format. Equals to "YYYY".
         */
        MeasurementStateSumDataProvider.cacheKeyDateFormat = "YYYY";
        Data.MeasurementStateSumDataProvider = MeasurementStateSumDataProvider;
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
        /** MeasurementStateTimeSum implementation.
         */
        var MeasurementStateTimeSum = (function (_super) {
            __extends(MeasurementStateTimeSum, _super);
            function MeasurementStateTimeSum(data) {
                var _this = _super.call(this, data) || this;
                _this.Uptime = data.uptime;
                _this.Setup = data.setup;
                _this.Stop = data.stop;
                _this.NoData = data.noData;
                return _this;
            }
            Object.defineProperty(MeasurementStateTimeSum.prototype, "Total", {
                /** Sum of all minutes.
                 */
                get: function () {
                    return this.Uptime + this.Setup + this.Stop + this.NoData;
                },
                enumerable: true,
                configurable: true
            });
            return MeasurementStateTimeSum;
        }(Data.MeasurementStateSum));
        Data.MeasurementStateTimeSum = MeasurementStateTimeSum;
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
        /** MeasurementStateTimeSum data provider.
         */
        var MeasurementStateTimeSumDataProvider = (function (_super) {
            __extends(MeasurementStateTimeSumDataProvider, _super);
            function MeasurementStateTimeSumDataProvider() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            Object.defineProperty(MeasurementStateTimeSumDataProvider.prototype, "Url", {
                get: function () {
                    return Data.CommunicationSetup.BaseApiUrl + "MeasurementStateTimeSumsQuery";
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(MeasurementStateTimeSumDataProvider.prototype, "CachePrefix", {
                get: function () {
                    return "MSTS.";
                },
                enumerable: true,
                configurable: true
            });
            MeasurementStateTimeSumDataProvider.prototype.TransformData = function (data) {
                return data.map(function (d) { return new Data.MeasurementStateTimeSum(d); });
            };
            return MeasurementStateTimeSumDataProvider;
        }(Data.MeasurementStateSumDataProvider));
        Data.MeasurementStateTimeSumDataProvider = MeasurementStateTimeSumDataProvider;
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
        /** MeasurementStateValueSum implementation.
         */
        var MeasurementStateValueSum = (function (_super) {
            __extends(MeasurementStateValueSum, _super);
            function MeasurementStateValueSum(data) {
                var _this = _super.call(this, data) || this;
                _this.Uptime = data.uptime;
                _this.Setup = data.setup;
                return _this;
            }
            Object.defineProperty(MeasurementStateValueSum.prototype, "Total", {
                /** Sum of all pulses.
                 */
                get: function () {
                    return this.Uptime + this.Setup;
                },
                enumerable: true,
                configurable: true
            });
            return MeasurementStateValueSum;
        }(Data.MeasurementStateSum));
        Data.MeasurementStateValueSum = MeasurementStateValueSum;
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
        /** MeasurementStateValueSum data provider.
         */
        var MeasurementStateValueSumDataProvider = (function (_super) {
            __extends(MeasurementStateValueSumDataProvider, _super);
            function MeasurementStateValueSumDataProvider() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            Object.defineProperty(MeasurementStateValueSumDataProvider.prototype, "Url", {
                get: function () {
                    return Data.CommunicationSetup.BaseApiUrl + "MeasurementStateValueSumsQuery";
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(MeasurementStateValueSumDataProvider.prototype, "CachePrefix", {
                get: function () {
                    return "MSVS.";
                },
                enumerable: true,
                configurable: true
            });
            MeasurementStateValueSumDataProvider.prototype.TransformData = function (data) {
                return data.map(function (d) { return new Data.MeasurementStateValueSum(d); });
            };
            return MeasurementStateValueSumDataProvider;
        }(Data.MeasurementStateSumDataProvider));
        Data.MeasurementStateValueSumDataProvider = MeasurementStateValueSumDataProvider;
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
        /** Measurement time series aggregation provider.
         */
        var MeasurementTimeSeriesAggregationProvider = (function () {
            /** Create new instance.
             * @param config Configuration of the provider.
             */
            function MeasurementTimeSeriesAggregationProvider(config) {
                var _this = this;
                this.config = config;
                /** Queue used for queuing fetch requests.
                 */
                this.queue = new Data.RequestQueue(1, function (items) { return _this.ProcessQueueItems(items); });
                this.views = config.Views || Data.MeasurementTimeSeriesAggregationViews;
            }
            Object.defineProperty(MeasurementTimeSeriesAggregationProvider.prototype, "Url", {
                /** Measurement API URL.
                 */
                get: function () {
                    return Data.CommunicationSetup.BaseApiUrl + "MeasurementTimeSeriesAggregationsQuery";
                },
                enumerable: true,
                configurable: true
            });
            /** Fetch data for specified query.
             * @param query Query determining data to fetch from the
             * @return Promise of returned data.
             */
            MeasurementTimeSeriesAggregationProvider.prototype.Fetch = function (query) {
                var deferred = $.Deferred();
                var queueItem = {
                    Promise: deferred.promise(),
                    Result: deferred,
                    Query: query
                };
                if (!query.To.isAfter(query.From)) {
                    throw "Invalid query: To is not after From";
                }
                this.queue.Push(queueItem);
                return queueItem.Promise;
            };
            /** Cancel data request, that was previously created by calling Fetch.
             * @param promise A promise identifying the request.
             * @return Returns true if item was successfuly removed from queue. Otherwise returns false.
             */
            MeasurementTimeSeriesAggregationProvider.prototype.Cancel = function (promise) {
                var item = this.queue.Get(promise);
                if (item == null) {
                    return false;
                }
                item.Result.reject({ Message: "Canceled by user." });
                return true;
            };
            /** Process queued items.
             */
            MeasurementTimeSeriesAggregationProvider.prototype.ProcessQueueItems = function (items) {
                var fetchItems = this.ConvertQueueItemsToFetchItems(items);
                var cacheKeys = this.GetCacheKeys(fetchItems);
                this.ApplyCachedData(cacheKeys);
                this.ResolveItems(fetchItems, false);
                fetchItems = fetchItems.filter(function (item) { return !item.IsHandled; });
                if (fetchItems.length === 0) {
                    return;
                }
                var incompleteCacheKeys = this.config.CacheSetup.CacheWritingEnabled ?
                    cacheKeys.filter(function (key) { return !key.LoadedDataRange || key.LoadedDataRange.To.isBefore(key.KeyRange.To); }) : [];
                this.LoadAndProcessDataFromServer(fetchItems, incompleteCacheKeys);
            };
            /** Generate all cache keys from fetch items and cached data.
             * @returns All keys, even keys without cached data.
             */
            MeasurementTimeSeriesAggregationProvider.prototype.GetCacheKeys = function (items) {
                var _this = this;
                var keys = Data.Utils.GetCacheKeys(items.map(function (item) { return ({
                    Item: item,
                    DataRanges: item.MissingDataRanges,
                    CacheKeyDuration: item.View.CacheKeyDuration
                }); }), function (item, from) { return item.CacheKeyBase + from.format(item.View.CacheKeyDateFormat); });
                var knownDataStart = {};
                var keysWithData = Object.keys(keys).map(function (keyId) {
                    var key = keys[keyId];
                    var keyItem = key.Items[0];
                    var data = _this.LoadCacheKeyFromCache(keyId, keyItem.View.PointDuration, key.Range.From);
                    var cacheKey = {
                        KeyId: keyId,
                        Data: data ? {
                            Data: data.Data,
                            DataFormat: data.DataFormat,
                            DataRange: { From: data.DataRange.From, To: key.Range.To }
                        } : null,
                        LoadedDataRange: data ? data.DataRange : null,
                        Items: key.Items,
                        KeyRange: key.Range,
                        QueryBase: keyItem.Query,
                        IsModified: false
                    };
                    if (data && data.DataRange.From.isAfter(key.Range.From)) {
                        knownDataStart[keyItem.CacheKeyBase] = data.DataRange.From;
                    }
                    return cacheKey;
                });
                return keysWithData.filter(function (key) {
                    var dataStart = knownDataStart[key.Items[0].CacheKeyBase];
                    return !dataStart || key.KeyRange.To.isAfter(dataStart);
                });
            };
            /** Load and process data from server.
             */
            MeasurementTimeSeriesAggregationProvider.prototype.LoadAndProcessDataFromServer = function (fetchItems, incompleteCacheKeys) {
                var _this = this;
                var aggregableCacheKeys = incompleteCacheKeys.map(function (key) { return ({
                    Item: { FetchItem: null, CacheKey: key, QueryBase: key.QueryBase },
                    AggregableKey: key.Items[0].CacheKeyBase,
                    Ranges: [key.LoadedDataRange ? { From: key.LoadedDataRange.To, To: key.KeyRange.To } : key.KeyRange]
                }); });
                var aggregableFetchItems = fetchItems.map(function (item) { return ({
                    Item: { FetchItem: item, CacheKey: null, QueryBase: item.Query },
                    AggregableKey: item.CacheKeyBase,
                    Ranges: item.MissingDataRanges
                }); });
                var aggregatedRanges = Data.Utils.AggregateTimeRanges(aggregableCacheKeys.concat(aggregableFetchItems));
                var queriesMap = {};
                var serverQueries = [];
                aggregatedRanges.forEach(function (range) {
                    var queryBase = range.AggregatedItems[0].QueryBase;
                    var serverQueryId = _this.GetQueryIdentifier({
                        MeasurementId: queryBase.MeasurementId,
                        View: queryBase.View,
                        From: range.AggregatedRange.From,
                        To: range.AggregatedRange.To
                    });
                    queriesMap[serverQueryId] = range.AggregatedItems;
                    var serverQuery = {
                        measurementId: queryBase.MeasurementId,
                        from: range.AggregatedRange.From.format("YYYY-MM-DDTHH:mm:ss[Z]"),
                        to: range.AggregatedRange.To.format("YYYY-MM-DDTHH:mm:ss[Z]"),
                        view: queryBase.View
                    };
                    serverQueries.push(serverQuery);
                });
                this.ProcessDataFromServer(serverQueries, queriesMap, fetchItems, incompleteCacheKeys);
            };
            /** Process data from server.
             */
            MeasurementTimeSeriesAggregationProvider.prototype.ProcessDataFromServer = function (serverQueries, queriesMap, fetchItems, incompleteCacheKeys) {
                var _this = this;
                var xhr = this.config.Bridge.Ajax({
                    type: "POST",
                    url: this.Url,
                    data: JSON.stringify({ Queries: serverQueries }),
                    contentType: "application/json; charset=utf-8",
                    accepts: { "json": "application/json" },
                    dataType: "json"
                });
                xhr.done(function (response) {
                    _this.ApplyServerResponse(response, queriesMap);
                    _this.SaveCacheKeysToCache(incompleteCacheKeys);
                    _this.ResolveItems(fetchItems, true);
                });
                xhr.fail(function () {
                    fetchItems.forEach(function (item) {
                        if (item.IsHandled) {
                            return;
                        }
                        item.Result.reject();
                    });
                });
                fetchItems.forEach(function (item) {
                    item.Result.fail(function () {
                        if (fetchItems.every(function (item) { return item.IsHandled; })) {
                            xhr.abort();
                        }
                    });
                });
            };
            /** Save caches key to cache.
             */
            MeasurementTimeSeriesAggregationProvider.prototype.SaveCacheKeysToCache = function (cacheKeys) {
                var _this = this;
                cacheKeys.forEach(function (key) {
                    if (!key.IsModified) {
                        return;
                    }
                    _this.SaveCacheKeyToCache(key);
                });
            };
            /** Save cache key to cache. Clear cache if save fails.
             */
            MeasurementTimeSeriesAggregationProvider.prototype.SaveCacheKeyToCache = function (key) {
                var keyData = {
                    Data: key.Data.Data,
                    DataFormat: key.Data.DataFormat
                };
                if (key.Data.DataRange.From.isAfter(key.KeyRange.From)) {
                    keyData.DataFrom = key.Data.DataRange.From.format("YYYY-MM-DDTHH:mm:ss[Z]");
                }
                var keyDataString = JSON.stringify(keyData);
                Data.Utils.SaveDataToCache(key.KeyId, keyDataString);
                key.IsModified = false;
            };
            /** Generate cache key base from measurement identifier and view cache key name.
             */
            MeasurementTimeSeriesAggregationProvider.prototype.GetCacheKeyBase = function (measurementId, viewCacheKeyName) {
                return this.config.CacheSetup.LocalStoragePrefix +
                    MeasurementTimeSeriesAggregationProvider.cachePrefix +
                    measurementId + "." +
                    viewCacheKeyName + ".";
            };
            /** Apply server response to fetch items and cache keys.
             */
            MeasurementTimeSeriesAggregationProvider.prototype.ApplyServerResponse = function (response, queriesMap) {
                var _this = this;
                response.results.forEach(function (result) {
                    var first = result.first || result.query.from;
                    var data = result.data;
                    var from = moment.utc(first);
                    var pointDuration = _this.views[result.query.view].PointDuration;
                    var pointSize = result.outputFormat ? result.outputFormat.length : 1;
                    var pointsCount = data.length / pointSize;
                    var to = from.clone().add(pointsCount * pointDuration);
                    var query = {
                        MeasurementId: result.query.measurementId,
                        From: moment.utc(result.query.from),
                        To: moment.utc(result.query.to),
                        View: result.query.view
                    };
                    var serverQueryId = _this.GetQueryIdentifier(query);
                    var queryItems = queriesMap[serverQueryId];
                    queryItems.forEach(function (item) {
                        if (item.CacheKey) {
                            _this.MergeDataWithCacheKey(item.CacheKey, {
                                Data: data,
                                DataFormat: result.outputFormat,
                                DataRange: { From: from, To: to }
                            }, query);
                        }
                        if (item.FetchItem) {
                            _this.MergeDataWithFetchItem(item.FetchItem, {
                                Data: data,
                                DataFormat: result.outputFormat,
                                DataRange: { From: from, To: to }
                            }, query);
                        }
                    });
                });
            };
            /** Apply cached data to fetch items.
             */
            MeasurementTimeSeriesAggregationProvider.prototype.ApplyCachedData = function (cachedKeys) {
                var _this = this;
                cachedKeys.forEach(function (key) {
                    var data = key.Data;
                    if (!data) {
                        return;
                    }
                    var loadedData = { Data: data.Data, DataFormat: data.DataFormat, DataRange: key.LoadedDataRange };
                    key.Items.forEach(function (item) {
                        _this.MergeDataWithFetchItem(item, loadedData, key.KeyRange);
                        item.IsNotified = false;
                    });
                });
            };
            /** Resolve fetch items. Only unhandled items without missing ranges are resolved.
             */
            MeasurementTimeSeriesAggregationProvider.prototype.ResolveItems = function (items, final) {
                var _this = this;
                items.forEach(function (item) {
                    if (item.IsHandled) {
                        return;
                    }
                    if (_this.IsFetchItemResolvable(item, final)) {
                        item.Result.resolve(_this.CreateResult(item));
                    }
                    else if (!item.IsNotified) {
                        item.Result.notify(_this.CreateResult(item));
                    }
                    if (final && !item.IsHandled) {
                        item.Result.reject("failed to fetch data");
                    }
                });
            };
            /** Create result for fetch item.
             */
            MeasurementTimeSeriesAggregationProvider.prototype.CreateResult = function (item) {
                return new Data.MeasurementTimeSeriesAggregationResult({
                    Data: item.Data,
                    OutputFormat: item.DataFormat,
                    First: item.DataRange.From,
                    Query: item.Query
                });
            };
            /** Convert queue items to fetch items.
             */
            MeasurementTimeSeriesAggregationProvider.prototype.ConvertQueueItemsToFetchItems = function (items) {
                var _this = this;
                return items.map(function (item, index) {
                    var view = _this.views[item.Query.View];
                    var dataTimeRange = Data.Utils.AlignTimeRangeToMs(item.Query, view.PointDuration);
                    var cacheKeyBase = _this.GetCacheKeyBase(item.Query.MeasurementId, view.CacheKeyName);
                    var fetchItem = {
                        Query: item.Query,
                        Result: item.Result,
                        View: view,
                        Data: [],
                        DataRange: dataTimeRange,
                        DataFormat: undefined,
                        MissingDataRanges: [{ From: dataTimeRange.From, To: dataTimeRange.To }],
                        CacheKeyBase: cacheKeyBase,
                        IsHandled: false,
                        IsNotified: true
                    };
                    fetchItem.Result.always(function () { return fetchItem.IsHandled = true; });
                    fetchItem.Result.progress(function () { return fetchItem.IsNotified = true; });
                    return fetchItem;
                });
            };
            /** Check if fetch item is resolvable.
             */
            MeasurementTimeSeriesAggregationProvider.prototype.IsFetchItemResolvable = function (item, final) {
                if (item.MissingDataRanges.length === 0) {
                    return true;
                }
                if (final && item.MissingDataRanges.every(function (range) { return range.To.isSame(item.DataRange.To); })) {
                    return true;
                }
                return false;
            };
            /** Merge data with fetch item.
             */
            MeasurementTimeSeriesAggregationProvider.prototype.MergeDataWithFetchItem = function (item, data, dataRequestedRange) {
                if (item.DataFormat === undefined) {
                    item.DataFormat = data.DataFormat || null;
                }
                if (!Data.Utils.AreArrayItemsIdentical(item.DataFormat, data.DataFormat)) {
                    Data.Utils.ClearCache();
                    item.Result.reject("Got incompatible parts of data.");
                    return false;
                }
                var dataPointSize = item.DataFormat ? item.DataFormat.length : 1;
                var merged = Data.Utils.MergeData(item.Data, item.DataRange, data.Data, data.DataRange, dataPointSize, item.View.PointDuration, dataRequestedRange.From, item.DataRange.From);
                if (!merged) {
                    // todo: log possible error
                    return false;
                }
                item.MissingDataRanges = Data.Utils.GetTimeRangesDifference(item.MissingDataRanges, merged);
                return true;
            };
            /** Merge data with cache key.
             */
            MeasurementTimeSeriesAggregationProvider.prototype.MergeDataWithCacheKey = function (key, data, dataRequestedRange) {
                if (!key.Data) {
                    var dataRangeUnion = Data.Utils.GetTimeRangeUnion(data.DataRange, key.KeyRange);
                    if (!dataRangeUnion) {
                        return false;
                    }
                    key.Data = {
                        Data: [],
                        DataRange: dataRangeUnion,
                        DataFormat: data.DataFormat
                    };
                }
                var item = key.Data;
                if (item.DataFormat === undefined) {
                    item.DataFormat = data.DataFormat || null;
                }
                if (!Data.Utils.AreArrayItemsIdentical(item.DataFormat, data.DataFormat)) {
                    // just return, data format mismatch is handled in MergeDataWithFetchItem
                    return false;
                }
                var dataPointSize = item.DataFormat ? item.DataFormat.length : 1;
                var merged = Data.Utils.MergeData(item.Data, item.DataRange, data.Data, data.DataRange, dataPointSize, key.Items[0].View.PointDuration, dataRequestedRange.From, key.KeyRange.From);
                if (!merged) {
                    // todo: log possible error
                    return false;
                }
                key.IsModified = key.IsModified || !!merged;
                return true;
            };
            /** Load cache key from cache.
             */
            MeasurementTimeSeriesAggregationProvider.prototype.LoadCacheKeyFromCache = function (keyId, pointDuration, keyFrom) {
                if (!localStorage) {
                    return null;
                }
                var dataRaw = localStorage.getItem(keyId);
                if (!dataRaw) {
                    return null;
                }
                var dataParsed = JSON.parse(dataRaw);
                var from = dataParsed.DataFrom ? moment.utc(dataParsed.DataFrom) : keyFrom;
                var dataPointSize = dataParsed.DataFormat ? dataParsed.DataFormat.length : 1;
                var to = from.clone().add((dataParsed.Data.length / dataPointSize) * pointDuration);
                return {
                    Data: dataParsed.Data,
                    DataRange: { From: from, To: to },
                    DataFormat: dataParsed.DataFormat
                };
            };
            /** Generate query identifier. Used for pairing fetch requests with server responses.
             */
            MeasurementTimeSeriesAggregationProvider.prototype.GetQueryIdentifier = function (q) {
                var timeFormat = "YYYYMMDDHHmmss";
                return q.MeasurementId.toString() + "." +
                    q.View + "." +
                    q.From.clone().utc().format(timeFormat) + "." +
                    q.To.clone().utc().format(timeFormat);
            };
            return MeasurementTimeSeriesAggregationProvider;
        }());
        /** Cache prefix of this provider.
         */
        MeasurementTimeSeriesAggregationProvider.cachePrefix = "MTSA.";
        Data.MeasurementTimeSeriesAggregationProvider = MeasurementTimeSeriesAggregationProvider;
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
        /** Measurement time series aggregation result.
         */
        var MeasurementTimeSeriesAggregationResult = (function () {
            /** Create new instance of MeasurementTimeSeriesAggregationResult from IMeasurementTimeSeriesAggregation.
             */
            function MeasurementTimeSeriesAggregationResult(result) {
                this.from = result.First;
                this.data = result.Data;
                this.dataKeys = result.OutputFormat;
            }
            Object.defineProperty(MeasurementTimeSeriesAggregationResult.prototype, "Data", {
                /** Data received from API.
                 */
                get: function () {
                    return this.data;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(MeasurementTimeSeriesAggregationResult.prototype, "From", {
                /** Start of data.
                 */
                get: function () {
                    return this.from;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(MeasurementTimeSeriesAggregationResult.prototype, "Values", {
                /** Return values. Calucate from data as ValueSum/ItemCount if needed.
                 */
                get: function () {
                    if (!this.values) {
                        var valueSumIndex = this.dataKeys.indexOf("ValueSum");
                        var itemCountIndex = this.dataKeys.indexOf("ItemCount");
                        var valuesCount = this.data.length / this.dataKeys.length;
                        if (this.dataKeys.length <= 1) {
                            this.values = this.data;
                        }
                        else if (itemCountIndex >= 0) {
                            var values = new Array(valuesCount);
                            for (var valueIndex = 0; valueSumIndex < this.data.length; valueSumIndex += this.dataKeys.length, itemCountIndex += this.dataKeys.length, valueIndex++) {
                                var valueSum = this.data[valueSumIndex];
                                var itemCount = this.data[itemCountIndex];
                                values[valueIndex] = valueSum != null ? valueSum / itemCount : null;
                            }
                            this.values = values;
                        }
                        else {
                            var values2 = new Array(valuesCount);
                            for (var valueIndex2 = 0; valueSumIndex < this.data.length; valueSumIndex += this.dataKeys.length, valueIndex2++) {
                                values2[valueIndex2] = this.data[valueSumIndex];
                            }
                            this.values = values2;
                        }
                    }
                    return this.values;
                },
                enumerable: true,
                configurable: true
            });
            return MeasurementTimeSeriesAggregationResult;
        }());
        Data.MeasurementTimeSeriesAggregationResult = MeasurementTimeSeriesAggregationResult;
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
        /** Available aggregation views.
         */
        Data.MeasurementTimeSeriesAggregationViews = {
            "Base.MinuteSet": {
                Id: "Base.MinuteSet",
                PointDuration: 60000,
                CacheKeyName: "V.B.MinS",
                CacheKeyDuration: "day",
                CacheKeyDateFormat: "YYYYMMDD"
            }, "Base.Hour": {
                Id: "Base.Hour",
                PointDuration: 3600000,
                CacheKeyName: "V.B.H",
                CacheKeyDuration: "month",
                CacheKeyDateFormat: "YYYYMM"
            }, "Base.Day": {
                Id: "Base.Day",
                PointDuration: 86400000,
                CacheKeyName: "V.B.D",
                CacheKeyDuration: "year",
                CacheKeyDateFormat: "YYYY"
            }
        };
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
/*!
 * ASP.NET SignalR JavaScript Library v2.2.0
 * http://signalr.net/
 *
 * Copyright Microsoft Open Technologies, Inc. All rights reserved.
 * Licensed under the Apache 2.0
 * https://github.com/SignalR/SignalR/blob/master/LICENSE.md
 *
 */
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        /** Indicates that SignalR is initialized.
         */
        var isSignalRInitialized = false;
        /** Initialize SignalR.
         */
        function InitSignalR() {
            if (isSignalRInitialized) {
                return;
            }
            isSignalRInitialized = true;
            (function ($, window) {
                /// <param name="$" type="jQuery" />
                "use strict";
                if (typeof ($.signalR) !== "function") {
                    throw new Error("SignalR: SignalR is not loaded. Please ensure SignalR library is referenced before the Plantyst SDK.");
                }
                var signalR = $.signalR;
                function makeProxyCallback(hub, callback) {
                    return function () {
                        // Call the client hub method
                        callback.apply(hub, $.makeArray(arguments));
                    };
                }
                function registerHubProxies(instance, shouldSubscribe) {
                    var key, hub, memberKey, memberValue, subscriptionMethod;
                    for (key in instance) {
                        if (instance.hasOwnProperty(key)) {
                            hub = instance[key];
                            if (!(hub.hubName)) {
                                // Not a client hub
                                continue;
                            }
                            if (shouldSubscribe) {
                                // We want to subscribe to the hub events
                                subscriptionMethod = hub.on;
                            }
                            else {
                                // We want to unsubscribe from the hub events
                                subscriptionMethod = hub.off;
                            }
                            // Loop through all members on the hub and find client hub functions to subscribe/unsubscribe
                            for (memberKey in hub.client) {
                                if (hub.client.hasOwnProperty(memberKey)) {
                                    memberValue = hub.client[memberKey];
                                    if (!$.isFunction(memberValue)) {
                                        // Not a client hub function
                                        continue;
                                    }
                                    subscriptionMethod.call(hub, memberKey, makeProxyCallback(hub, memberValue));
                                }
                            }
                        }
                    }
                }
                $.hubConnection.prototype.createHubProxies = function () {
                    var proxies = {};
                    this.starting(function () {
                        // Register the hub proxies as subscribed
                        // (instance, shouldSubscribe)
                        registerHubProxies(proxies, true);
                        this._registerSubscribedHubs();
                    }).disconnected(function () {
                        // Unsubscribe all hub proxies when we "disconnect".  This is to ensure that we do not re-add functional call backs.
                        // (instance, shouldSubscribe)
                        registerHubProxies(proxies, false);
                    });
                    proxies['intelliSenseHub'] = this.createHubProxy('intelliSenseHub');
                    proxies['intelliSenseHub'].client = {};
                    proxies['intelliSenseHub'].server = {};
                    proxies['metadocumentsHub'] = this.createHubProxy('metadocumentsHub');
                    proxies['metadocumentsHub'].client = {};
                    proxies['metadocumentsHub'].server = {};
                    return proxies;
                };
                signalR.hub = $.hubConnection(Data.CommunicationSetup.SignalRUrl, { useDefaultPath: false });
                $.extend(signalR, signalR.hub.createHubProxies());
            }(jQuery, window));
        }
        Data.InitSignalR = InitSignalR;
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
        /** A queue for data requests.
         */
        var RequestQueue = (function () {
            /** Initialize a new instance of the class.
             * @param {number} processDelay Mayimum delay (in milliseconds) between item push and processCallback call.
             * @param {(items: IRequestQueueItem[]) => void} processCallback A function, that processes passed items.
             */
            function RequestQueue(processDelay, processCallback) {
                this.processDelay = processDelay;
                this.processCallback = processCallback;
                /** Queue items, that have not been processed.
                 */
                this.waitingItems = [];
                /** Queue items, that have been processed, but not completed.
                 */
                this.inProcessItems = [];
                /** Flag indicating whether processDelay timer is running.
                 */
                this.processDelayTimerRunning = false;
            }
            /** Push new item to queue.
             * @param {IDataTimeMeasurementQuery} query Parameters for data request.
             * @param {JQueryDeferred<any>} deferred Instance of deferred that will be used for notification about
             * completion of request.
             */
            RequestQueue.prototype.Push = function (item) {
                var _this = this;
                item.Promise.always(function () { return _this.RemoveItem(item); });
                this.waitingItems.push(item);
                if (!this.processDelayTimerRunning) {
                    setTimeout(function () { _this.ProcessItems(); }, this.processDelay);
                    this.processDelayTimerRunning = true;
                }
            };
            /** Get item from queue.
             * @param {JQueryPromise<any>} promise A promise used to identify the item.
             */
            RequestQueue.prototype.Get = function (promise) {
                return this.inProcessItems.concat(this.waitingItems)
                    .filter(function (item) { return item.Promise === promise; })
                    .shift();
            };
            /** Remove item from queue.
             * @param {IRequestQueueItem} item
             */
            RequestQueue.prototype.RemoveItem = function (item) {
                var index = this.waitingItems.indexOf(item);
                if (index >= 0) {
                    this.waitingItems.splice(index, 1);
                }
                index = this.inProcessItems.indexOf(item);
                if (index >= 0) {
                    this.inProcessItems.splice(index, 1);
                }
            };
            /** Process queue items.
             */
            RequestQueue.prototype.ProcessItems = function () {
                this.processDelayTimerRunning = false;
                if (this.waitingItems.length > 0) {
                    this.processCallback(this.waitingItems.slice(0));
                    this.inProcessItems = this.inProcessItems.concat(this.waitingItems);
                    this.waitingItems = [];
                }
            };
            return RequestQueue;
        }());
        Data.RequestQueue = RequestQueue;
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        var Server;
        (function (Server) {
            "use strict";
        })(Server = Data.Server || (Data.Server = {}));
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        var Server;
        (function (Server) {
            "use strict";
        })(Server = Data.Server || (Data.Server = {}));
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        var Server;
        (function (Server) {
            "use strict";
        })(Server = Data.Server || (Data.Server = {}));
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        var Server;
        (function (Server) {
            "use strict";
        })(Server = Data.Server || (Data.Server = {}));
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        var Server;
        (function (Server) {
            "use strict";
        })(Server = Data.Server || (Data.Server = {}));
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        var Server;
        (function (Server) {
            "use strict";
        })(Server = Data.Server || (Data.Server = {}));
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        var Server;
        (function (Server) {
            "use strict";
        })(Server = Data.Server || (Data.Server = {}));
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        var Server;
        (function (Server) {
            "use strict";
        })(Server = Data.Server || (Data.Server = {}));
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        var Server;
        (function (Server) {
            "use strict";
        })(Server = Data.Server || (Data.Server = {}));
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        var Server;
        (function (Server) {
            "use strict";
        })(Server = Data.Server || (Data.Server = {}));
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        var Server;
        (function (Server) {
            "use strict";
        })(Server = Data.Server || (Data.Server = {}));
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        var Server;
        (function (Server) {
            "use strict";
        })(Server = Data.Server || (Data.Server = {}));
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        var Server;
        (function (Server) {
            "use strict";
        })(Server = Data.Server || (Data.Server = {}));
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        var Server;
        (function (Server) {
            "use strict";
        })(Server = Data.Server || (Data.Server = {}));
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        var Server;
        (function (Server) {
            "use strict";
        })(Server = Data.Server || (Data.Server = {}));
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        var Server;
        (function (Server) {
            "use strict";
        })(Server = Data.Server || (Data.Server = {}));
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        var Server;
        (function (Server) {
            "use strict";
        })(Server = Data.Server || (Data.Server = {}));
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        var Server;
        (function (Server) {
            "use strict";
        })(Server = Data.Server || (Data.Server = {}));
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        var Server;
        (function (Server) {
            "use strict";
        })(Server = Data.Server || (Data.Server = {}));
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        var Server;
        (function (Server) {
            "use strict";
        })(Server = Data.Server || (Data.Server = {}));
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        var Server;
        (function (Server) {
            "use strict";
        })(Server = Data.Server || (Data.Server = {}));
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        var Server;
        (function (Server) {
            "use strict";
        })(Server = Data.Server || (Data.Server = {}));
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        "use strict";
        /** Subscription provider.
         */
        var SubscriptionProvider = (function () {
            function SubscriptionProvider(Bridge, CacheSetup, maximumServerRefreshRate) {
                if (Bridge === void 0) { Bridge = new Data.CommunicationBridge(); }
                if (CacheSetup === void 0) { CacheSetup = new Data.CacheSetup(); }
                if (maximumServerRefreshRate === void 0) { maximumServerRefreshRate = moment.duration(5, "minutes"); }
                this.Bridge = Bridge;
                this.CacheSetup = CacheSetup;
                this.maximumServerRefreshRate = maximumServerRefreshRate;
                /** Local storage cache prefix.
                 */
                this.CachePrefix = "subscriptions.";
            }
            Object.defineProperty(SubscriptionProvider.prototype, "url", {
                /** Server API URL.
                 */
                get: function () {
                    return Data.CommunicationSetup.BaseApiUrl + "Subscriptions";
                },
                enumerable: true,
                configurable: true
            });
            /** Fetch subscriptions list and active subscription.
             * The fetch may be only from local storage, depending on maximumServerRefreshRate constructor value.
             */
            SubscriptionProvider.prototype.Fetch = function (userId) {
                var result = $.Deferred();
                var cachedResponse = this.GetCachedResponse(userId);
                var cachedResult = cachedResponse && this.GenerateFetchResult(cachedResponse.Response);
                var lastRequestTime = cachedResponse && cachedResponse.RequestTime;
                var nextRequestTime = lastRequestTime && lastRequestTime.clone().add(this.maximumServerRefreshRate);
                var canMakeServerCall = !nextRequestTime || nextRequestTime < moment();
                if (canMakeServerCall) {
                    if (cachedResponse) {
                        result.notify(cachedResult);
                    }
                    this.FetchFromServer(userId, result);
                }
                else {
                    if (cachedResponse) {
                        result.resolve(cachedResult);
                    }
                }
                return Plantyst.CancellableJQueryPromiseFromDeferred(result);
            };
            /** Fetch user subscriptions from server.
             */
            SubscriptionProvider.prototype.FetchFromServer = function (userId, result) {
                var _this = this;
                var requestStart = moment();
                var request = this.Bridge.Ajax({
                    type: "GET",
                    url: this.url,
                    accepts: { "json": "application/hal+json" },
                    dataType: "json"
                });
                request.done(function (response) {
                    _this.CacheResponse(userId, response, requestStart);
                    result.resolve(_this.GenerateFetchResult(response));
                });
                request.fail(function () {
                    result.reject("Ajax call failed");
                });
                result.always(function () {
                    request.abort();
                });
            };
            /** Generate cache key.
             */
            SubscriptionProvider.prototype.GetCacheKey = function (userId) {
                return this.CacheSetup.LocalStoragePrefix + this.CachePrefix + userId;
            };
            /** Generate fetch result from server response.
             */
            SubscriptionProvider.prototype.GenerateFetchResult = function (response) {
                if (!response || !response._embedded || !response._embedded.subscription) {
                    return { Subscriptions: [], ActiveSubscription: null };
                }
                var subscriptions = response._embedded.subscription.map(function (s) {
                    var features;
                    if (s.features) {
                        features = s.features.map(function (f) { return ({ Configuration: f.configuration, Title: f.title, EnabledUntil: f.enabledUntil ? moment(f.enabledUntil) : null }); });
                    }
                    return { Id: s.subscriptionId, Title: s.title, Name: s.name, Features: features };
                });
                var activeHref = response && response._links && response._links.currentSubscription &&
                    response._links.currentSubscription.href || null;
                var activeSubscriptionId = response._embedded.subscription
                    .filter(function (s) { return s._links.self.href === activeHref; })
                    .map(function (s) { return s.subscriptionId; })[0];
                var activeSubscription = subscriptions.filter(function (s) { return s.Id === activeSubscriptionId; })[0];
                return { Subscriptions: subscriptions, ActiveSubscription: activeSubscription };
            };
            /** Cache server response for userId to local storage.
             */
            SubscriptionProvider.prototype.CacheResponse = function (userId, response, requestStart) {
                if (!localStorage || !this.CacheSetup.CacheWritingEnabled) {
                    return;
                }
                var cacheValue = {
                    Response: response,
                    RequestTime: requestStart
                };
                Data.Utils.SaveDataToCache(this.GetCacheKey(userId), JSON.stringify(cacheValue));
            };
            /** Get cached server response from local storage.
             */
            SubscriptionProvider.prototype.GetCachedResponse = function (userId) {
                if (!localStorage) {
                    return null;
                }
                var response = localStorage.getItem(this.GetCacheKey(userId));
                var parsedResponse = response ? JSON.parse(response) : null;
                if (parsedResponse) {
                    parsedResponse.RequestTime = moment(parsedResponse.RequestTime);
                }
                return parsedResponse;
            };
            return SubscriptionProvider;
        }());
        Data.SubscriptionProvider = SubscriptionProvider;
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
/// <reference path="CacheSetup.ts"/>
var Plantyst;
(function (Plantyst) {
    var Data;
    (function (Data) {
        var Utils;
        (function (Utils) {
            "use strict";
            /** Check if array items are identical.
             */
            Utils.AreArrayItemsIdentical = function (a, b) {
                if ((!a && !b) || a === b) {
                    return true;
                }
                if (!a || !b) {
                    return false;
                }
                var i = a.length;
                if (i !== b.length) {
                    return false;
                }
                while (i--) {
                    if (a[i] !== b[i]) {
                        return false;
                    }
                }
                return true;
            };
            /** Align time range to given millisecond interval.
             */
            function AlignTimeRangeToMs(timeRange, alignment) {
                var from = timeRange.From.valueOf();
                var to = timeRange.To.valueOf();
                from = from - (from % alignment);
                var toRemainder = to % alignment;
                if (toRemainder) {
                    to = to - toRemainder + alignment;
                }
                return { From: moment.utc(from), To: moment.utc(to) };
            }
            Utils.AlignTimeRangeToMs = AlignTimeRangeToMs;
            /** Align time range to time unit. Time unit can be any moment.js time unit identifier, such as "minute".
             */
            function AlignTimeRangeToTimeUnit(timeRange, timeUnit) {
                var from = timeRange.From.clone().startOf(timeUnit);
                var to = timeRange.To.clone().startOf(timeUnit);
                if (timeRange.To.isAfter(to)) {
                    to.add(1, timeUnit);
                }
                return { From: from, To: to };
            }
            Utils.AlignTimeRangeToTimeUnit = AlignTimeRangeToTimeUnit;
            /** Get cache key time ranges, that are aligned to time unit.
             */
            function GetCacheKeyTimeRangesAlignedToTimeUnit(range, timeUnit) {
                var aligned = [];
                for (var from = range.From.clone().startOf(timeUnit); from.isBefore(range.To); from.add(1, timeUnit)) {
                    aligned.push({
                        From: from.clone(),
                        To: from.clone().add(1, timeUnit)
                    });
                }
                return aligned;
            }
            Utils.GetCacheKeyTimeRangesAlignedToTimeUnit = GetCacheKeyTimeRangesAlignedToTimeUnit;
            /** Get cache keys from given items.
             */
            function GetCacheKeys(items, formatCacheKey) {
                var keys = {};
                items.forEach(function (item) {
                    item.DataRanges.forEach(function (range) {
                        var alignedRanges = Utils.GetCacheKeyTimeRangesAlignedToTimeUnit(range, item.CacheKeyDuration);
                        alignedRanges.forEach(function (aligned) {
                            var key = formatCacheKey(item.Item, aligned.From);
                            var keyInfo = keys[key];
                            if (!keyInfo) {
                                keyInfo = { Items: [], Range: aligned };
                                keys[key] = keyInfo;
                            }
                            keyInfo.Items.push(item.Item);
                        });
                    });
                });
                return keys;
            }
            Utils.GetCacheKeys = GetCacheKeys;
            /** Merge data. Can alter final data range if new data do not start at new data requested range.
             */
            function MergeData(finalData, finalDataRange, newData, newDataRange, dataPointSize, dataPointDuration, newDataRequestedFrom, finalDataRequestedFrom) {
                var finalFrom = finalDataRange.From.valueOf() / dataPointDuration;
                var finalTo = finalDataRange.To.valueOf() / dataPointDuration;
                var newFrom = newDataRange.From.valueOf() / dataPointDuration;
                var newTo = newDataRange.To.valueOf() / dataPointDuration;
                var overlapFrom = Math.max(finalFrom, newFrom);
                var overlapTo = Math.min(finalTo, newTo);
                if (overlapFrom >= overlapTo) {
                    return null;
                }
                var finalIndexFrom = (overlapFrom - finalFrom) * dataPointSize;
                var finalIndexTo = (overlapTo - finalFrom) * dataPointSize - 1;
                var newIndexFrom = (overlapFrom - newFrom) * dataPointSize;
                for (var finalIndex = finalIndexFrom, newIndex = newIndexFrom; finalIndex <= finalIndexTo; finalIndex++, newIndex++) {
                    finalData[finalIndex] = newData[newIndex];
                }
                var merged = {
                    From: moment.utc(overlapFrom * dataPointDuration),
                    To: moment.utc(overlapTo * dataPointDuration)
                };
                if (merged.From.isSame(newDataRange.From) && merged.From.isAfter(newDataRequestedFrom)) {
                    finalData.splice(0, (overlapFrom - finalFrom) * dataPointSize);
                    finalDataRange.From = merged.From;
                    merged.From = finalDataRequestedFrom;
                }
                return merged;
            }
            Utils.MergeData = MergeData;
            /** Get difference between time ranges and one other time range.
             */
            function GetTimeRangesDifference(ranges, diffRange) {
                var differenceRanges = [];
                ranges.forEach(function (range) {
                    var isOutside = diffRange.From.isAfter(range.To) || diffRange.To.isBefore(range.From);
                    if (isOutside) {
                        differenceRanges.push(range);
                        return;
                    }
                    var isAfterFrom = diffRange.From.isAfter(range.From);
                    var isBeforeTo = diffRange.To.isBefore(range.To);
                    var isInside = isAfterFrom && isBeforeTo;
                    if (isInside) {
                        differenceRanges.push({
                            From: range.From,
                            To: diffRange.From
                        }, {
                            From: diffRange.To,
                            To: range.To
                        });
                        return;
                    }
                    if (isAfterFrom) {
                        differenceRanges.push({
                            From: range.From,
                            To: diffRange.From
                        });
                        return;
                    }
                    if (isBeforeTo) {
                        differenceRanges.push({
                            From: diffRange.To,
                            To: range.To
                        });
                        return;
                    }
                });
                return differenceRanges;
            }
            Utils.GetTimeRangesDifference = GetTimeRangesDifference;
            /** Aggregate time ranges.
             */
            function AggregateTimeRanges(items) {
                var aggregableRanges = {};
                items.forEach(function (item, index) {
                    var aggregableKey = item.AggregableKey;
                    var aggr = aggregableRanges[aggregableKey];
                    if (!aggr) {
                        aggr = [];
                        aggregableRanges[aggregableKey] = aggr;
                    }
                    PushArray(aggr, item.Ranges.map(function (range) { return ({ Id: index.toString(), Item: item.Item, Range: range }); }));
                });
                var aggregatedRanges = [];
                Object.keys(aggregableRanges).forEach(function (key) {
                    var ranges = aggregableRanges[key];
                    ranges.sort(function (a, b) { return a.Range.From.valueOf() - b.Range.From.valueOf(); });
                    var aggr;
                    var finishAggregatedQuery = function () {
                        aggregatedRanges.push({
                            AggregableKey: aggr.AggregableKey,
                            AggregatedItems: Object.keys(aggr.Items).map(function (key) { return aggr.Items[key]; }),
                            AggregatedRange: aggr.Range
                        });
                        aggr = null;
                    };
                    ranges.forEach(function (curr) {
                        if (aggr) {
                            if (curr.Range.From <= aggr.Range.To) {
                                if (curr.Range.To > aggr.Range.To) {
                                    aggr.Range.To = curr.Range.To;
                                }
                                aggr.Items[curr.Id] = curr.Item;
                            }
                            else {
                                finishAggregatedQuery();
                            }
                        }
                        if (!aggr) {
                            aggr = { AggregableKey: key, Items: {}, Range: { From: curr.Range.From, To: curr.Range.To } };
                            aggr.Items[curr.Id] = curr.Item;
                        }
                    });
                    finishAggregatedQuery();
                });
                return aggregatedRanges;
            }
            Utils.AggregateTimeRanges = AggregateTimeRanges;
            /** Add items from source to target.
             */
            function PushArray(target, source) {
                target.push.apply(target, source);
            }
            Utils.PushArray = PushArray;
            /** Save data to cache.
             */
            function SaveDataToCache(key, data) {
                for (var attempt = 1; attempt <= 3; attempt++) {
                    try {
                        localStorage.setItem(key, data);
                        if (localStorage.getItem(key) === data) {
                            // data saved successfuly
                            return;
                        }
                    }
                    catch (ex) {
                        // do nothing
                    }
                    // at this point, attempt was unsuccessful
                    switch (attempt) {
                        case 1:
                            ClearCache();
                            break;
                        case 2:
                            ClearCache(true);
                            break;
                    }
                }
            }
            Utils.SaveDataToCache = SaveDataToCache;
            /** Cache clearing keys.
             */
            Utils.ClearCacheKeys = [];
            /** Setup cache clearing.
             */
            function SetupCacheClearing(setup) {
                Utils.ClearCacheKeys = [
                    "MTSA.",
                    "MSTS.",
                    "MSVS."
                ].map(function (key) { return setup.LocalStoragePrefix + key; });
            }
            Utils.SetupCacheClearing = SetupCacheClearing;
            SetupCacheClearing(new Data.CacheSetup());
            /** Clear local storage, based on cache clearing setup.
             */
            function ClearCache(forceDelete) {
                if (forceDelete === void 0) { forceDelete = false; }
                if (!localStorage) {
                    return;
                }
                if (forceDelete) {
                    localStorage.clear();
                }
                else {
                    Object.keys(localStorage).forEach(function (key) {
                        if (Utils.ClearCacheKeys.some(function (e) { return key.lastIndexOf(e, 0) === 0; })) {
                            localStorage.removeItem(key);
                        }
                    });
                }
            }
            Utils.ClearCache = ClearCache;
            /** Get Union of time ranges.
             */
            function GetTimeRangeUnion(t1, t2) {
                var union = { From: moment.max([t1.From, t2.From]), To: moment.min([t1.To, t2.To]) };
                if (union.From >= union.To) {
                    return null;
                }
                return union;
            }
            Utils.GetTimeRangeUnion = GetTimeRangeUnion;
            /** Sort strings ascendingly.
             */
            function SortStringsAsc(items) {
                items.sort(function (a, b) {
                    if (a < b) {
                        return -1;
                    }
                    if (a > b) {
                        return 1;
                    }
                    return 0;
                });
            }
            Utils.SortStringsAsc = SortStringsAsc;
            /** Generate new GUID.
             */
            function NewGuid() {
                function s4() {
                    return Math.floor((1 + Math.random()) * 0x10000)
                        .toString(16)
                        .substring(1);
                }
                return s4() + s4() + "-" + s4() + "-" + s4() + "-" +
                    s4() + "-" + s4() + s4() + s4();
            }
            Utils.NewGuid = NewGuid;
            /** Return unique values from given array. All items must be either string or number.
             */
            function UniqueStringsOrNumbers(values) {
                var seen = {};
                return values.filter(function (element) { return !(element in seen) && (seen[element] = true); });
            }
            Utils.UniqueStringsOrNumbers = UniqueStringsOrNumbers;
        })(Utils = Data.Utils || (Data.Utils = {}));
    })(Data = Plantyst.Data || (Plantyst.Data = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    "use strict";
    Plantyst.CancellableJQueryPromiseFromPromise = function (promise, cancel) {
        var result = promise;
        result.Cancel = cancel;
        return result;
    };
    Plantyst.CancellableJQueryPromiseFromDeferred = function (deferred) {
        var result = deferred.promise();
        result.Cancel = function () { return deferred.reject(); };
        return result;
    };
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
        /** HTML canvas wrapper.
         */
        var Canvas = (function () {
            function Canvas(element) {
                if (element === void 0) { element = document.createElement("canvas"); }
                this.element = element;
                this.$element = $(element);
                this.RenderingContext = element.getContext("2d");
            }
            Object.defineProperty(Canvas.prototype, "Element", {
                /** HTML element.
                 */
                get: function () {
                    return this.element;
                },
                enumerable: true,
                configurable: true
            });
            /** Clear the canvas.
             */
            Canvas.prototype.Clear = function () {
                this.RenderingContext.clearRect(0, 0, this.width, this.height);
            };
            /** Set canvas size and scale.
             */
            Canvas.prototype.SetSize = function (size) {
                var width = size.Width;
                var height = size.Height;
                var scale = size.Scale;
                var sizeChanged = width !== this.width || height !== this.height;
                var scaleChanged = scale !== this.scale;
                if (sizeChanged) {
                    this.width = width;
                    this.height = height;
                    this.$element.css({
                        width: width,
                        height: height
                    });
                }
                if (scaleChanged) {
                    this.scale = scale;
                }
                if (sizeChanged || scaleChanged) {
                    var scaledWidth = Math.floor(width * scale);
                    var scaledHeight = Math.floor(height * scale);
                    this.scaledWidth = scaledWidth;
                    this.scaledHeight = scaledHeight;
                    this.$element.attr({
                        width: scaledWidth,
                        height: scaledHeight
                    });
                    // context scale must be set whenever size or scale changes, because it is reset on size change
                    // http://stackoverflow.com/questions/5414663/disable-reset-in-html5-canvas-when-width-height-is-set
                    this.RenderingContext.scale(scale, scale);
                }
            };
            return Canvas;
        }());
        View.Canvas = Canvas;
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
        /** Canvas time chart area.
         */
        var CanvasTimeChartArea = (function () {
            /** Initialize new instance of CanvasTimeChartArea.
             * @param canvas Canvas element used for drawing and interaction.
             * @param interactive Flag indicating whether chart area should handle user input (touch and mouse events).
             * @param disableDrawIfNotVisible Optimization flag indicating whether chart area should not be drawn when not visible.
             */
            function CanvasTimeChartArea(canvas, interactive, disableDrawIfNotVisible) {
                if (interactive === void 0) { interactive = true; }
                if (disableDrawIfNotVisible === void 0) { disableDrawIfNotVisible = true; }
                var _this = this;
                this.disableDrawIfNotVisible = disableDrawIfNotVisible;
                /** Maximum zoom ratio between wide canvas and visible canvas, on Y axis.
                 * Wide canvas contains more values and therefore usualy has greater range on Y axis.
                 */
                this.QuickDrawYZoomMax = 0.25;
                /** Layers for best quality drawing.
                 */
                this.layers = new View.CanvasTimeChartAreaLayerGroup(function () { return _this.CreateLayer(); });
                /** Renderable layers for best quality drawing.
                 */
                this.renderableLayers = [];
                /** Wide layers for quick drawing.
                 */
                this.wideLayers = new View.CanvasTimeChartAreaLayerGroup(function () { return _this.CreateWideLayer(); });
                /** Renderable layers for quick drawing.
                 */
                this.wideRenderableLayers = [];
                /** List of chart area series.
                 */
                this.Series = [];
                /** Indicate that chart is visible on screen.
                 */
                this.isVisible = true;
                /** Indicate that redraw is needed.
                 * This flag is usually set when canvas is not visible and time range changes. It is cleared on every draw.
                 */
                this.isRedrawNeeded = false;
                this.lastDrawTypeWasQuick = false;
                /** Listeners for after-draw event.
                 */
                this.afterDrawListeners = [];
                /** Listeners for before-draw event.
                 */
                this.drawRequestListeners = [];
                /** Indicate that series data changed.
                 */
                this.dataChanged = false;
                /** Release resources used by the instance.
                 */
                this.disposeCallbacks = [];
                if (interactive) {
                    var interaction = new Plantyst.View.TimeRangeInteraction();
                    interaction.AttachTo(this.canvas.Element, function () { return ({ Start: 0, End: _this.width - 1 }); }, function () { return _this.timeRanges; });
                    interaction.TimeRangesChanging = function (ranges) { return _this.OnTimeRangesChanging(ranges); };
                    interaction.TimeRangesChanged = function (ranges) { return _this.OnTimeRangesChanged(ranges); };
                }
                if (disableDrawIfNotVisible) {
                    var updateVisibilityAndRenderLayers = function () { return _this.UpdateVisibilityAndRenderLayersIfNeeded(); };
                    $(window).add("body").on("scroll resize", null, updateVisibilityAndRenderLayers);
                    this.disposeCallbacks.push(function () { return $(window).add("body").off("scroll resize", updateVisibilityAndRenderLayers); });
                }
                if (canvas != null) {
                    this.BindToCanvas(canvas);
                }
            }
            /** Create new layer for visible canvas rendering.
             */
            CanvasTimeChartArea.prototype.CreateLayer = function () {
                var layer = new View.CanvasTimeChartAreaLayer(new View.CanvasTimeChartAreaLayerRenderer());
                if (this.canvas) {
                    layer.Renderer.EnableRendering(this.canvas);
                }
                return layer;
            };
            /** Create new layer for invisible wide canvas rendering.
             */
            CanvasTimeChartArea.prototype.CreateWideLayer = function () {
                var layer = new View.CanvasTimeChartAreaLayer();
                if (this.canvas != null) {
                    layer.Renderer.EnableRendering();
                }
                return layer;
            };
            /** Bind canvas element.
             */
            CanvasTimeChartArea.prototype.BindToCanvas = function (canvas) {
                if (this.canvas != null) {
                    this.UnbindCanvas();
                }
                this.canvas = canvas;
                this.layers.Layers.forEach(function (layer) { return layer.Renderer.EnableRendering(canvas); });
                this.wideLayers.Layers.forEach(function (layer) { return layer.Renderer.EnableRendering(); });
                if (this.size != null) {
                    this.UpdateSizeAndRender();
                }
            };
            /** Unbind bound canvas element.
             */
            CanvasTimeChartArea.prototype.UnbindCanvas = function () {
                this.layers.Layers.forEach(function (layer) { return layer.Renderer.DisableRendering(); });
                this.wideLayers.Layers.forEach(function (layer) { return layer.Renderer.DisableRendering(); });
                this.canvas = null;
            };
            /** Update internal visibility flag.
             */
            CanvasTimeChartArea.prototype.UpdateVisibility = function () {
                this.isVisible = this.disableDrawIfNotVisible ? View.Utils.IsElementVisible(this.canvas.Element) : true;
            };
            /** Update internal visibility flag and redraw chart area if it is visible and redraw is needed.
             */
            CanvasTimeChartArea.prototype.UpdateVisibilityAndRenderLayersIfNeeded = function () {
                this.UpdateVisibility();
                if (this.isVisible && this.isRedrawNeeded) {
                    this.drawRequestListeners.forEach(function (listener) { return listener(); });
                    this.UpdateValueRangeAndRenderLayers();
                    this.afterDrawListeners.forEach(function (listener) { return listener(true); });
                }
            };
            /** Add series.
             */
            CanvasTimeChartArea.prototype.Add = function (series, timeRangeIndex) {
                if (timeRangeIndex === void 0) { timeRangeIndex = 0; }
                if (this.Series.some(function (s) { return s.Series === series; })) {
                    return false;
                }
                this.layers.AddSeries(series, timeRangeIndex);
                this.wideLayers.AddSeries(series, timeRangeIndex);
                this.Series.push({ Series: series, TimeRangeIndex: timeRangeIndex });
                return true;
            };
            /** Remove series.
             */
            CanvasTimeChartArea.prototype.Remove = function (series) {
                var newSeries = this.Series.filter(function (s) { return s.Series !== series; });
                if (newSeries.length === this.Series.length) {
                    return false;
                }
                this.layers.RemoveSeries(series);
                this.wideLayers.RemoveSeries(series);
                this.Series = newSeries;
                return true;
            };
            /** Set time ranges. Setting time ranges also causes the area to be redrawn.
             */
            CanvasTimeChartArea.prototype.SetTimeRanges = function (ranges) {
                this.DrawAsync(ranges, false);
            };
            /** Get current time ranges.
             */
            CanvasTimeChartArea.prototype.GetTimeRanges = function () {
                return this.timeRanges;
            };
            /** Set chart area size.
             */
            CanvasTimeChartArea.prototype.SetSize = function (size) {
                size = { Width: Math.floor(size.Width), Height: Math.floor(size.Height), Scale: size.Scale };
                if (size.Scale == null) {
                    size.Scale = View.Utils.GetDevicePixelRatio();
                }
                this.size = size;
                this.width = size.Width;
                this.height = size.Height;
                var wideSize = { Width: size.Width * 3, Height: size.Height, Scale: size.Scale };
                this.wideSize = wideSize;
                if (this.canvas == null) {
                    return;
                }
                this.UpdateSizeAndRender();
            };
            /** Update size in internal objects after resize or canvas binding.
             */
            CanvasTimeChartArea.prototype.UpdateSizeAndRender = function () {
                this.layers.SetSize(this.size);
                this.wideLayers.SetSize(this.wideSize);
                this.scaledWideWidth = Math.floor(this.size.Width * 3 * this.size.Scale);
                this.scaledHeight = Math.floor(this.size.Height * this.size.Scale);
                this.isRedrawNeeded = true;
                this.UpdateVisibilityAndRenderLayersIfNeeded();
                this.RenderWideLayers();
            };
            /** Inform the chart area that series data changed.
             */
            CanvasTimeChartArea.prototype.DataChanged = function () {
                this.dataChanged = true;
            };
            /** Asynchronously fetch series data and draw the chart area.
             * Drawing may not occur, for example if chart area is optimized to avoid drawing when not visible.
             * @param timeRanges Time ranges in which the series should be drawn.
             * @param quick Indicate that drawing should be done quickly.
             * @returns Successfull promise completion means that data fetch was successful.
             * If promise result is true, chart was also redrawn.
             */
            CanvasTimeChartArea.prototype.DrawAsync = function (timeRanges, quick) {
                var _this = this;
                this.lastDrawTypeWasQuick = quick;
                var timeRangesChanged = !!timeRanges;
                if (timeRangesChanged) {
                    this.timeRanges = timeRanges;
                    this.wideTimeRanges = timeRanges.map(function (range) {
                        var duration = range.To.valueOf() - range.From.valueOf();
                        return { From: range.From.clone().subtract(duration), To: range.To.clone().add(duration) };
                    });
                }
                if (!this.timeRanges || this.timeRanges.length === 0) {
                    return Plantyst.CancellableJQueryPromiseFromDeferred($.Deferred().resolve(false));
                }
                var result;
                this.drawRequestListeners.forEach(function (listener) { return listener(); });
                if (quick) {
                    result = this.DrawQuickly();
                }
                else {
                    if (!timeRangesChanged) {
                        if (this.drawProgressPromise) {
                            return this.drawProgressPromise;
                        }
                        else {
                            var rendered = this.UpdateValueRangeAndRenderLayers();
                            result = Plantyst.CancellableJQueryPromiseFromDeferred($.Deferred().resolve(rendered));
                        }
                    }
                    else {
                        this.DrawBestQualityAsync();
                        this.UpdateWideLayersForQuickDrawing();
                        result = this.drawProgressPromise;
                    }
                }
                result.progress(function () { return _this.afterDrawListeners.forEach(function (listener) { return listener(false); }); });
                result.done(function () { return _this.afterDrawListeners.forEach(function (listener) { return listener(true); }); });
                return result;
            };
            /** Cancel drawing that is currently in progress.
             */
            CanvasTimeChartArea.prototype.CancelDrawing = function () {
                if (this.drawProgressDeferred) {
                    this.drawProgressDeferred.reject();
                }
            };
            /** Draw in best quality.
             */
            CanvasTimeChartArea.prototype.DrawBestQualityAsync = function () {
                var _this = this;
                this.CancelDrawing();
                var deferred = $.Deferred();
                var promise = Plantyst.CancellableJQueryPromiseFromDeferred(deferred);
                this.drawProgressDeferred = deferred;
                this.drawProgressPromise = promise;
                var requestAnimationFrameId = requestAnimationFrame(function () {
                    var resolved = false;
                    deferred.always(function () {
                        resolved = true;
                        _this.drawProgressDeferred = null;
                        _this.drawProgressPromise = null;
                    });
                    var renderableLayers = [];
                    _this.renderableLayers = renderableLayers;
                    var layers = _this.layers.UpdateLayers(_this.timeRanges);
                    deferred.fail(function () { return layers.forEach(function (layer) {
                        layer.Update.Cancel();
                    }); });
                    layers.forEach(function (layer, index) {
                        var setLayer = function () {
                            renderableLayers[index] = layer.Layer;
                        };
                        layer.Update.progress(setLayer).done(setLayer);
                    });
                    var layerUpdates = layers.map(function (l) { return l.Update; });
                    var progress = View.Utils.GroupNotificationsDelayed(layerUpdates);
                    progress.progress(function (changed) {
                        if (resolved) {
                            return;
                        }
                        if (changed) {
                            deferred.notify(_this.UpdateValueRangeAndRenderLayers());
                        }
                    });
                    progress.done(function (changed) {
                        if (resolved) {
                            return;
                        }
                        var drawn = false;
                        if (changed) {
                            drawn = _this.UpdateValueRangeAndRenderLayers();
                        }
                        deferred.resolve(drawn);
                    });
                });
                deferred.fail(function () {
                    cancelAnimationFrame(requestAnimationFrameId);
                });
            };
            /** Update value range and render layers.
             */
            CanvasTimeChartArea.prototype.UpdateValueRangeAndRenderLayers = function () {
                if (this.canvas == null) {
                    return false;
                }
                var valueRange = View.CanvasTimeChartAreaLayerGroup.GetValueRange(this.renderableLayers);
                this.ValueRangeChanged(valueRange);
                this.renderableLayers.forEach(function (layer) {
                    layer.Renderer.ValueRange = valueRange;
                });
                var result = this.RenderLayers();
                if (this.dataChanged) {
                    this.dataChanged = false;
                    this.RenderWideLayers();
                }
                return result;
            };
            /** Render layers.
             * @return A flag indicating that layers were rendered.
             */
            CanvasTimeChartArea.prototype.RenderLayers = function () {
                if (!this.isVisible) {
                    this.isRedrawNeeded = true;
                    return false;
                }
                else {
                    this.isRedrawNeeded = false;
                    this.canvas.Clear();
                    this.OnBeforeSeriesDraw();
                    this.renderableLayers.forEach(function (layer) {
                        layer.Renderer.Render();
                    });
                    return true;
                }
            };
            /** Draw quickly, from prepared wide layers.
             */
            CanvasTimeChartArea.prototype.DrawQuickly = function () {
                var _this = this;
                this.CancelDrawing();
                var result = $.Deferred();
                this.drawProgressDeferred = result;
                var requestAnimationFrameId = requestAnimationFrame(function () {
                    if (_this.canvas == null) {
                        return Plantyst.CancellableJQueryPromiseFromDeferred($.Deferred().resolve(false));
                    }
                    if (!_this.isVisible) {
                        _this.isRedrawNeeded = true;
                        return Plantyst.CancellableJQueryPromiseFromDeferred($.Deferred().resolve(false));
                    }
                    _this.canvas.Clear();
                    var valueRange = View.CanvasTimeChartAreaLayerGroup.GetValueRange(_this.wideLayers.Layers, _this.timeRanges);
                    _this.wideLayers.Layers.forEach(function (layer) {
                        if (!layer.Renderer.ValueRange) {
                            return;
                        }
                        var wideValueRange = layer.Renderer.ValueRange;
                        var valueMin = valueRange.Min;
                        var valueMax = valueRange.Max;
                        var valueLength = valueMax - valueMin;
                        var wideValueMin = wideValueRange.Min;
                        var wideValueMax = wideValueRange.Max;
                        var wideValueLength = wideValueRange.Max - wideValueRange.Min;
                        var minValueLength = wideValueLength * _this.QuickDrawYZoomMax;
                        if (valueLength === 0) {
                            if (wideValueLength === 0) {
                                wideValueMax = wideValueMin + 1;
                            }
                            valueMin = wideValueMin;
                            valueMax = wideValueMax;
                        }
                        else if (valueLength < minValueLength) {
                            valueMax = valueMin + minValueLength;
                        }
                        if (valueMin < valueRange.Min) {
                            valueRange.Min = valueMin;
                        }
                        if (valueMax > valueRange.Max) {
                            valueRange.Max = valueMax;
                        }
                    });
                    _this.ValueRangeChanging(valueRange);
                    _this.OnBeforeSeriesDraw();
                    _this.wideLayers.Layers.forEach(function (layer) {
                        if (!layer.Renderer.ValueRange) {
                            return;
                        }
                        var timeRange = _this.timeRanges[layer.TimeRangeIndex];
                        var wideTimeRange = layer.Renderer.TimeRange;
                        var wideValueRange = layer.Renderer.ValueRange;
                        var valueMin = valueRange.Min;
                        var valueMax = valueRange.Max;
                        var wideValueMin = wideValueRange.Min;
                        var wideValueMax = wideValueRange.Max;
                        var x = View.Utils.GetImageOverlap(timeRange.From.valueOf(), timeRange.To.valueOf(), _this.width, wideTimeRange.From.valueOf(), wideTimeRange.To.valueOf(), _this.scaledWideWidth);
                        var y = View.Utils.GetImageOverlap(valueMin, valueMax, _this.height, wideValueMin, wideValueMax, _this.scaledHeight);
                        if (!x || !y) {
                            return;
                        }
                        _this.canvas.RenderingContext.drawImage(layer.Renderer.Canvas.Element, x.FromPx2, _this.scaledHeight - y.ToPx2, x.ToPx2 - x.FromPx2, y.ToPx2 - y.FromPx2, x.FromPx1, _this.height - y.ToPx1, x.ToPx1 - x.FromPx1, y.ToPx1 - y.FromPx1);
                    });
                    result.resolve(true);
                });
                result.fail(function () {
                    cancelAnimationFrame(requestAnimationFrameId);
                });
                return Plantyst.CancellableJQueryPromiseFromDeferred(result);
            };
            /** Update wide layers for quick drawing.
             */
            CanvasTimeChartArea.prototype.UpdateWideLayersForQuickDrawing = function () {
                var _this = this;
                if (this.wideLayerUpdates) {
                    this.wideLayerUpdates.forEach(function (update) { return update.Cancel(); });
                }
                var layers = this.wideLayers.UpdateLayers(this.wideTimeRanges);
                var renderableLayers = [];
                this.wideRenderableLayers = renderableLayers;
                var layersCount = 0;
                var finishedCount = 0;
                layers.forEach(function (layer, index) {
                    layersCount++;
                    var draw = function () {
                        renderableLayers[index] = layer.Layer;
                        if (_this.canvas != null) {
                            var valueRange = View.CanvasTimeChartAreaLayerGroup.GetValueRange([layer.Layer]);
                            layer.Layer.Renderer.ValueRange = valueRange;
                            _this.RenderWideLayer(layer.Layer);
                        }
                    };
                    layer.Update.progress(draw).done(function () {
                        draw();
                        finishedCount++;
                        if (layersCount === finishedCount) {
                            _this.wideLayerUpdates = null;
                        }
                    });
                });
                var layerUpdates = layers.map(function (l) { return l.Update; });
                this.wideLayerUpdates = layerUpdates;
            };
            /** Render all wide layers.
             */
            CanvasTimeChartArea.prototype.RenderWideLayers = function () {
                var _this = this;
                this.wideRenderableLayers.forEach(function (layer) {
                    var valueRange = View.CanvasTimeChartAreaLayerGroup.GetValueRange([layer]);
                    layer.Renderer.ValueRange = valueRange;
                    _this.RenderWideLayer(layer);
                });
            };
            /** Render wide layer.
             */
            CanvasTimeChartArea.prototype.RenderWideLayer = function (layer) {
                layer.Renderer.Canvas.Clear();
                layer.Renderer.Render();
            };
            /** Stub called by generator when time ranges are changing.
             * @param {ITimeRange[]} timeRanges A list of time ranges.
             */
            CanvasTimeChartArea.prototype.TimeRangesChanging = function (timeRanges) {
                ;
            };
            /** Stub called by generator when time ranges changed.
             * @param {ITimeRange[]} timeRanges A list of time ranges.
             */
            CanvasTimeChartArea.prototype.TimeRangesChanged = function (timeRanges) {
                ;
            };
            /** Function called when time ranges are changing.
             * @param timeRanges A list of time ranges.
             */
            CanvasTimeChartArea.prototype.OnTimeRangesChanging = function (timeRanges) {
                this.DrawAsync(timeRanges, true);
            };
            /** Function called when time ranges changed.
             * @param timeRanges A list of time ranges.
             */
            CanvasTimeChartArea.prototype.OnTimeRangesChanged = function (timeRanges) {
                this.DrawAsync(timeRanges, false);
            };
            /** Function called when value range is changing.
             * @param valueRange Value range.
             */
            CanvasTimeChartArea.prototype.ValueRangeChanging = function (valueRange) {
                ;
            };
            /** Function called when value range changed.
             * @param valueRange Value range.
             */
            CanvasTimeChartArea.prototype.ValueRangeChanged = function (valueRanges) {
                ;
            };
            /** Override this function to do custom drawing on the canvas before series are drawn.
             */
            CanvasTimeChartArea.prototype.OnBeforeSeriesDraw = function () {
                ;
            };
            /** Get currently rendered series renderer.
             */
            CanvasTimeChartArea.prototype.GetSeriesRenderingInfo = function (seriesIndex) {
                var layers = this.lastDrawTypeWasQuick ? this.wideRenderableLayers : this.renderableLayers;
                var series = this.Series[seriesIndex].Series;
                var layer;
                var renderer;
                layers.some(function (l) {
                    var layerSeriesIndex = l.Series.indexOf(series);
                    if (layerSeriesIndex < 0) {
                        return false;
                    }
                    layer = l;
                    renderer = l.Renderer.SeriesRenderers[layerSeriesIndex];
                    return true;
                });
                if (!layer || !renderer) {
                    return null;
                }
                return { Renderer: renderer, Series: series, Layer: layer };
            };
            /** Get series point info from rendered data.
             */
            CanvasTimeChartArea.prototype.GetSeriesPointInfoFromTime = function (point, seriesIndex) {
                var info = this.GetSeriesRenderingInfo(seriesIndex);
                if (!info) {
                    return null;
                }
                return info.Renderer.GetPointInfo(point);
            };
            /** Get series point info from rendered data.
             * @param pointPx Pixels from left side of the area.
             */
            CanvasTimeChartArea.prototype.GetSeriesPointInfoFromPx = function (pointPx, seriesIndex) {
                var info = this.GetSeriesRenderingInfo(seriesIndex);
                if (!info) {
                    return null;
                }
                var timeRange = this.timeRanges[info.Layer.TimeRangeIndex];
                var scale = d3.scale.linear()
                    .range([timeRange.From.valueOf(), timeRange.To.valueOf()])
                    .domain([0, this.width]);
                var time = moment(scale(pointPx));
                return info.Renderer.GetPointInfo(time);
            };
            /** Add listener for after-draw event.
             */
            CanvasTimeChartArea.prototype.AddAfterDrawListener = function (listener) {
                this.afterDrawListeners.push(listener);
            };
            /** Remove listener for after-draw event.
             */
            CanvasTimeChartArea.prototype.RemoveAfterDrawListener = function (listener) {
                this.afterDrawListeners = this.afterDrawListeners.filter(function (p) { return p !== listener; });
            };
            /** Add listener for before-draw event.
             */
            CanvasTimeChartArea.prototype.AddDrawRequestListener = function (listener) {
                this.drawRequestListeners.push(listener);
            };
            /** Remove listener for before-draw event.
             */
            CanvasTimeChartArea.prototype.RemoveDrawRequestListener = function (listener) {
                this.drawRequestListeners = this.drawRequestListeners.filter(function (p) { return p !== listener; });
            };
            /** Dispose events from array.
             */
            CanvasTimeChartArea.prototype.DisposeCallbacks = function () {
                this.disposeCallbacks.forEach(function (callback) {
                    callback();
                });
            };
            return CanvasTimeChartArea;
        }());
        View.CanvasTimeChartArea = CanvasTimeChartArea;
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
        /** Grid renderer for canvas time chart area.
         */
        var CanvasTimeChartAreaGrid = (function () {
            /** Create new instance of grid renderer.
             * @param canvas Canvas element used for rendering.
             * @param isPrimaryCanvasHandler Flag indicating whether this renderer is primary handler of the canvas.
             * If the canvas is shared with chart area, set to false.
             */
            function CanvasTimeChartAreaGrid(canvas, isPrimaryCanvasHandler) {
                this.isPrimaryCanvasHandler = isPrimaryCanvasHandler;
                /** Positions of vertical grid lines for horizontal axis.
                 */
                this.horizontalAxisLinePositions = [];
                /** Positions of horizontal grid lines for vertical axis.
                 */
                this.verticalAxisLinePositions = [];
                /** Width of the grid.
                 */
                this.width = 0;
                /** Height of the grid.
                 */
                this.height = 0;
                if (canvas != null) {
                    this.BindToCanvas(canvas);
                }
            }
            /** Bind canvas element.
             */
            CanvasTimeChartAreaGrid.prototype.BindToCanvas = function (canvas) {
                if (this.canvas != null) {
                    this.UnbindCanvas();
                }
                this.canvas = canvas;
            };
            /** Unbind bound canvas element.
             */
            CanvasTimeChartAreaGrid.prototype.UnbindCanvas = function () {
                this.canvas = null;
            };
            /** Set positions of vertical grid lines for horizontal axis.
             */
            CanvasTimeChartAreaGrid.prototype.SetHorizontalAxisTickPositions = function (tickPositions) {
                this.horizontalAxisLinePositions = tickPositions;
            };
            /** Set positions of horizontal grid lines for vertical axis.
             */
            CanvasTimeChartAreaGrid.prototype.SetVerticalAxisTickPositions = function (tickPositions) {
                this.verticalAxisLinePositions = tickPositions;
            };
            /** Draw the grid on the canvas.
             */
            CanvasTimeChartAreaGrid.prototype.Draw = function () {
                var _this = this;
                var ctx = this.canvas.RenderingContext;
                if (this.isPrimaryCanvasHandler) {
                    ctx.clearRect(0, 0, this.width, this.height);
                }
                ctx.strokeStyle = "#DDDDDD";
                ctx.lineWidth = 1;
                this.horizontalAxisLinePositions.forEach(function (linePx) {
                    ctx.beginPath();
                    ctx.moveTo(linePx, 0);
                    ctx.lineTo(linePx, _this.height);
                    ctx.stroke();
                });
                this.verticalAxisLinePositions.forEach(function (linePx) {
                    ctx.beginPath();
                    ctx.moveTo(0, linePx);
                    ctx.lineTo(_this.width, linePx);
                    ctx.stroke();
                });
            };
            /** Set the size of rendering canvas.
             */
            CanvasTimeChartAreaGrid.prototype.SetSize = function (width, height) {
                this.width = width;
                this.height = height;
                if (this.isPrimaryCanvasHandler) {
                    this.canvas.SetSize({ Width: width, Height: height, });
                    this.Draw();
                }
            };
            return CanvasTimeChartAreaGrid;
        }());
        View.CanvasTimeChartAreaGrid = CanvasTimeChartAreaGrid;
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
        /** Canvas time chart area layer. Renders series for one time range.
         * When updating, layer keeps its old rendering state until it gets first renderer from the update.
         */
        var CanvasTimeChartAreaLayer = (function () {
            function CanvasTimeChartAreaLayer(Renderer) {
                if (Renderer === void 0) { Renderer = new View.CanvasTimeChartAreaLayerRenderer(); }
                this.Renderer = Renderer;
                /** Chart area series.
                 */
                this.Series = [];
            }
            /** Update data for drawing.
             */
            CanvasTimeChartAreaLayer.prototype.Update = function (timeRange) {
                var _this = this;
                if (this.update) {
                    this.update.Result.Cancel();
                }
                this.update = new View.CanvasTimeChartAreaLayerUpdate(this.Series.slice(), timeRange);
                this.update.Start();
                this.update.Result
                    .progress(function () { return _this.UseUpdateDataForRendering(); })
                    .done(function () { return _this.UseUpdateDataForRendering(); })
                    .always(function () { return _this.update = null; });
                return this.update.Result;
            };
            /** Use data for rendering.
             */
            CanvasTimeChartAreaLayer.prototype.UseUpdateDataForRendering = function () {
                this.Renderer.SetDataFromUpdate(this.update);
            };
            return CanvasTimeChartAreaLayer;
        }());
        View.CanvasTimeChartAreaLayer = CanvasTimeChartAreaLayer;
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
        /** Canvas time chart area layer group.
         */
        var CanvasTimeChartAreaLayerGroup = (function () {
            function CanvasTimeChartAreaLayerGroup(createLayer) {
                this.createLayer = createLayer;
                /** Layers in the group.
                 */
                this.Layers = [];
            }
            /** Add series.
             */
            CanvasTimeChartAreaLayerGroup.prototype.AddSeries = function (series, timeRangeIndex) {
                var layer = this.Layers[timeRangeIndex];
                if (!layer) {
                    layer = this.createLayer();
                    layer.TimeRangeIndex = timeRangeIndex;
                    if (this.size) {
                        layer.Renderer.SetSize(this.size);
                    }
                    this.Layers[timeRangeIndex] = layer;
                }
                layer.Series.push(series);
            };
            /** Remove series.
             */
            CanvasTimeChartAreaLayerGroup.prototype.RemoveSeries = function (series) {
                var _this = this;
                this.Layers.some(function (layer, index) {
                    var seriesIndex = layer.Series.indexOf(series);
                    if (seriesIndex < 0) {
                        return false;
                    }
                    delete layer.Series[seriesIndex];
                    if (Object.keys(layer.Series).length === 0) {
                        delete _this.Layers[index];
                    }
                    return true;
                });
            };
            /** Set layers group size.
             */
            CanvasTimeChartAreaLayerGroup.prototype.SetSize = function (size) {
                this.size = size;
                this.Layers.forEach(function (layer) { return layer.Renderer.SetSize(size); });
            };
            /** Update layers data and draw them.
             */
            CanvasTimeChartAreaLayerGroup.prototype.UpdateLayers = function (timeRanges) {
                var result = [];
                this.Layers.forEach(function (layer, index) {
                    var range = timeRanges[index];
                    if (!range) {
                        return;
                    }
                    var update = layer.Update(range);
                    result.push({ Layer: layer, Update: update });
                });
                return result;
            };
            /** Get value range from layers and given time ranges.
             * When time ranges are not specified, time ranges from particular layers are used.
             */
            CanvasTimeChartAreaLayerGroup.GetValueRange = function (layers, timeRanges) {
                var min, max;
                layers.forEach(function (layer) {
                    var timeRange = timeRanges ? timeRanges[layer.TimeRangeIndex] : layer.Renderer.TimeRange;
                    layer.Renderer.SeriesRenderers.forEach(function (renderer) {
                        var range = renderer.GetYRange(timeRange.From, timeRange.To);
                        if (!range) {
                            return;
                        }
                        if (min == null || range.YMin < min) {
                            min = range.YMin;
                        }
                        if (max == null || range.YMax > max) {
                            max = range.YMax;
                        }
                    });
                });
                if (min == null) {
                    min = 0;
                }
                if (max == null) {
                    max = 0;
                }
                return { Min: min, Max: max };
            };
            return CanvasTimeChartAreaLayerGroup;
        }());
        View.CanvasTimeChartAreaLayerGroup = CanvasTimeChartAreaLayerGroup;
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
        /** Chart area layer renderer.
         */
        var CanvasTimeChartAreaLayerRenderer = (function () {
            function CanvasTimeChartAreaLayerRenderer() {
                /** Series renderers.
                 */
                this.SeriesRenderers = [];
                /** Draw options passed to series renderers.
                 */
                this.drawOptions = { scale: null };
            }
            /** Enable rendering to the canvas. Create own invisible canvas if the canvas parameter is not specified.
             */
            CanvasTimeChartAreaLayerRenderer.prototype.EnableRendering = function (canvas) {
                if (canvas === void 0) { canvas = new View.Canvas(); }
                this.Canvas = canvas;
            };
            /** Disable rendering.
             */
            CanvasTimeChartAreaLayerRenderer.prototype.DisableRendering = function () {
                this.Canvas = null;
            };
            /** Set canvas size.
             */
            CanvasTimeChartAreaLayerRenderer.prototype.SetSize = function (size) {
                if (this.Canvas != null) {
                    this.Canvas.SetSize(size);
                    this.drawOptions.scale = size.Scale;
                }
            };
            /** Set data from update.
             */
            CanvasTimeChartAreaLayerRenderer.prototype.SetDataFromUpdate = function (update) {
                this.SetData(update.TimeRange, update.Renderers);
            };
            /** Set data.
             */
            CanvasTimeChartAreaLayerRenderer.prototype.SetData = function (timeRange, renderers) {
                this.TimeRange = timeRange;
                this.SeriesRenderers = renderers;
            };
            /** Render data using series renderers.
             */
            CanvasTimeChartAreaLayerRenderer.prototype.Render = function () {
                var _this = this;
                this.SeriesRenderers.forEach(function (renderer) {
                    renderer.Draw(_this.Canvas.Element, _this.ValueRange.Min, _this.ValueRange.Max, _this.drawOptions);
                });
            };
            return CanvasTimeChartAreaLayerRenderer;
        }());
        View.CanvasTimeChartAreaLayerRenderer = CanvasTimeChartAreaLayerRenderer;
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
        /** Chart area layer data update.
         */
        var CanvasTimeChartAreaLayerUpdate = (function () {
            function CanvasTimeChartAreaLayerUpdate(Series, TimeRange) {
                this.Series = Series;
                this.TimeRange = TimeRange;
                /** Series renderers.
                 */
                this.Renderers = [];
                /** Count of series with finished data fetch.
                 */
                this.finishedSeriesCount = 0;
                /** Update result.
                 */
                this.deferred = $.Deferred();
                /** Update result promise.
                 */
                this.Result = Plantyst.CancellableJQueryPromiseFromDeferred(this.deferred);
                /** Series renderer promises.
                 */
                this.rendererPromises = [];
            }
            /** Start the update.
             */
            CanvasTimeChartAreaLayerUpdate.prototype.Start = function () {
                var _this = this;
                var rendererPromises = this.Series.map(function (s) { return s.Fetch(_this.TimeRange.From, _this.TimeRange.To); });
                this.rendererPromises = rendererPromises;
                if (rendererPromises.length === 0) {
                    this.deferred.resolve();
                    return this.Result;
                }
                rendererPromises.forEach(function (promise, index) {
                    promise.progress(function (renderer) {
                        _this.HandleFetchResult(renderer, index, false);
                    });
                    promise.done(function (renderer) {
                        _this.HandleFetchResult(renderer, index, true);
                    });
                    promise.fail(function () {
                        _this.HandleFetchResult(null, index, true);
                    });
                });
                this.deferred.fail(function () {
                    if (typeof _this.notifyTimer === "number") {
                        clearTimeout(_this.notifyTimer);
                        _this.notifyTimer = null;
                    }
                    rendererPromises.forEach(function (p) { return p.Cancel(); });
                });
            };
            /** Process fetch result.
             */
            CanvasTimeChartAreaLayerUpdate.prototype.HandleFetchResult = function (renderer, index, isFinal) {
                var _this = this;
                if (this.Result.state() !== "pending") {
                    return;
                }
                if (renderer) {
                    this.Renderers[index] = renderer;
                }
                if (isFinal) {
                    this.finishedSeriesCount++;
                }
                if (typeof this.notifyTimer !== "number") {
                    this.notifyTimer = setTimeout(function () {
                        _this.notifyTimer = null;
                        if (_this.finishedSeriesCount === _this.Series.length) {
                            _this.deferred.resolve();
                        }
                        else {
                            _this.deferred.notify();
                        }
                    }, 0);
                }
            };
            return CanvasTimeChartAreaLayerUpdate;
        }());
        View.CanvasTimeChartAreaLayerUpdate = CanvasTimeChartAreaLayerUpdate;
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        var Localization;
        (function (Localization) {
            var Generic;
            (function (Generic) {
                "use strict";
                /** Localize number.
                 */
                function LocalizeNumber(value, minDecimalDigits) {
                    if (minDecimalDigits === void 0) { minDecimalDigits = 0; }
                    var decimalSeparator = Localization.Localize("number.decimalSeparator");
                    var thousandsSeparator = Localization.Localize("number.thousandsSeparator");
                    if (typeof (value) !== "number" || isNaN(value) || !isFinite(value)) {
                        return value.toString();
                    }
                    var isNegative = value < 0;
                    value = Math.abs(value);
                    var ns = value.toString().split(".");
                    var n = ns[0]
                        .split("").reverse().join("")
                        .match(/(.{1,3})/g).join(thousandsSeparator)
                        .split("").reverse().join("");
                    var nd = (ns[1] || "");
                    if (minDecimalDigits && minDecimalDigits > nd.length) {
                        nd += Array(minDecimalDigits - nd.length + 1).join("0");
                    }
                    return (isNegative ? "-" : "") + n + (nd ? decimalSeparator + nd : "");
                }
                Generic.LocalizeNumber = LocalizeNumber;
                /** Split number representation into number with word modifier (for example 1 thousand).
                 * Possible modifier values are: thousand, million, billion.
                 */
                function GetNumberWithModifier(rawNum) {
                    if (rawNum === 0) {
                        return { Number: 0, Modifier: null };
                    }
                    var num;
                    if (rawNum >= 1000000000) {
                        num = rawNum / 1000000000;
                    }
                    else if (rawNum >= 1000000) {
                        num = rawNum / 1000000;
                    }
                    else if (rawNum >= 1000) {
                        num = rawNum / 1000;
                    }
                    else {
                        num = rawNum;
                    }
                    var modifier;
                    if (rawNum >= 1000000000) {
                        modifier = "billion";
                    }
                    else if (rawNum >= 1000000) {
                        modifier = "million";
                    }
                    else if (rawNum >= 1000) {
                        modifier = "thousand";
                    }
                    else {
                        modifier = null;
                    }
                    return { Number: num, Modifier: modifier };
                }
                Generic.GetNumberWithModifier = GetNumberWithModifier;
                function RoundNumber(value, maxDecimalDigits) {
                    var decimalDigitsModifier = Math.pow(10, maxDecimalDigits);
                    return Math.round(value * decimalDigitsModifier) / decimalDigitsModifier;
                }
                Generic.RoundNumber = RoundNumber;
                /** Localize number. Internal function, used by localization functions in individual cultures.
                 */
                function LocalizeNumberInternal(value, options, getValueCountability, localizeValueModifier, localizeUnits) {
                    if (options === void 0) { options = {}; }
                    if (typeof (value) === "number" && typeof (options.MultiplyBy) === "number") {
                        value *= options.MultiplyBy;
                    }
                    var alternativeUnit = options.QuantityType && options.UnitName &&
                        View.MeasurementQuantityTypes[options.QuantityType] &&
                        View.MeasurementQuantityTypes[options.QuantityType].AlternativeUnits[options.UnitName];
                    if (alternativeUnit) {
                        value = alternativeUnit.ConvertFromDefault(value);
                    }
                    var unitsValueCountability = getValueCountability(value);
                    var numWithModifier = typeof (options.WithWordModifierFrom) === "number" && value >= options.WithWordModifierFrom ?
                        Generic.GetNumberWithModifier(value) :
                        null;
                    if (numWithModifier && numWithModifier.Modifier) {
                        value = numWithModifier.Number;
                    }
                    if (typeof options.MaxDecimalDigits === "number") {
                        value = Generic.RoundNumber(value, options.MaxDecimalDigits);
                    }
                    else if (typeof options.MaxDecimalDigits === "function") {
                        var maxDecimalDigitsFunc = options.MaxDecimalDigits;
                        var maxDecimalDigits = maxDecimalDigitsFunc(value, numWithModifier && numWithModifier.Modifier);
                        if (maxDecimalDigits != null) {
                            value = Generic.RoundNumber(value, maxDecimalDigits);
                        }
                    }
                    var num = Generic.LocalizeNumber(value, options.MinDecimalDigits);
                    var valueModifier = localizeValueModifier(value, numWithModifier && numWithModifier.Modifier);
                    var units;
                    if (options.CustomUnit) {
                        units = options.CustomUnit;
                    }
                    else {
                        var unitName = alternativeUnit && options.UnitName ||
                            options.QuantityType && options.UnitType &&
                                View.MeasurementQuantityTypes[options.QuantityType] &&
                                View.MeasurementQuantityTypes[options.QuantityType][options.UnitType];
                        units = unitName ?
                            localizeUnits(options.QuantityType, unitName, unitsValueCountability) :
                            null;
                    }
                    return num + (valueModifier ? " " + valueModifier : "") + (units ? " " + units : "");
                }
                Generic.LocalizeNumberInternal = LocalizeNumberInternal;
            })(Generic = Localization.Generic || (Localization.Generic = {}));
        })(Localization = View.Localization || (View.Localization = {}));
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        var Localization;
        (function (Localization) {
            "use strict";
        })(Localization = View.Localization || (View.Localization = {}));
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        var Localization;
        (function (Localization) {
            "use strict";
            var culture = "cs-CZ";
            Localization.Resources = Localization.Resources || {};
            Localization.Resources[culture] = {};
            Localization.Resources[culture]["quantity.dewPoint.degreesCelsius"] = "°C";
            Localization.Resources[culture]["quantity.rate.pieces"] = "ks";
            Localization.Resources[culture]["quantity.rate.piecesPerMinute"] = "ks/min";
            Localization.Resources[culture]["quantity.speed.meters"] = "m";
            Localization.Resources[culture]["quantity.speed.metersPerMinute"] = "m/min";
            Localization.Resources[culture]["quantity.temperature.degreesCelsius"] = "°C";
            Localization.Resources[culture]["quantity.stroke.dash"] = "-";
            Localization.Resources[culture]["quantity.stroke.dashPerMinute"] = "-/min";
            Localization.Resources[culture]["quantity.power.wattMinutes"] = "Wm";
            Localization.Resources[culture]["quantity.power.watts"] = "W";
            Localization.Resources[culture]["quantity.power.wattHours"] = "Wh";
            Localization.Resources[culture]["quantity.power.kilowattHours"] = "kWh";
            Localization.Resources[culture]["quantity.power.kilowatts"] = "kW";
            Localization.Resources[culture]["metric.Production.name"] = "Produkce";
            Localization.Resources[culture]["metric.Uptime.name"] = "Využití";
            Localization.Resources[culture]["number.thousandsSeparator"] = " ";
            Localization.Resources[culture]["number.decimalSeparator"] = ",";
            Localization.Resources[culture]["quantity.flow.cubicMeter"] = "m\u00B3";
            Localization.Resources[culture]["quantity.flow.cubicMeterPerMinute"] = "m\u00B3/min";
            Localization.Resources[culture]["quantity.workload.percent"] = "%";
            Localization.Resources[culture]["quantity.rotation.cumulativeRotations"] = "ot";
            Localization.Resources[culture]["quantity.rotation.rotationsPerMinute"] = "ot/min";
            var localResources = {};
            localResources["quantity.speed.meters.one"] = "m";
            localResources["quantity.speed.meters.many"] = "m";
            localResources["quantity.speed.meters.decimal"] = "m";
            localResources["quantity.rate.pieces.one"] = "ks";
            localResources["quantity.rate.pieces.many"] = "ks";
            localResources["quantity.rate.pieces.decimal"] = "ks";
            localResources["quantity.stroke.dash.one"] = null;
            localResources["quantity.stroke.dash.many"] = null;
            localResources["quantity.stroke.dash.decimal"] = null;
            localResources["quantity.power.wattMinutes.one"] = "Wm";
            localResources["quantity.power.wattMinutes.many"] = "Wm";
            localResources["quantity.power.wattMinutes.decimal"] = "Wm";
            localResources["quantity.power.wattHours.one"] = "Wh";
            localResources["quantity.power.wattHours.many"] = "Wh";
            localResources["quantity.power.wattHours.decimal"] = "Wh";
            localResources["quantity.power.kilowattHours.one"] = "kWh";
            localResources["quantity.power.kilowattHours.many"] = "kWh";
            localResources["quantity.power.kilowattHours.decimal"] = "kWh";
            localResources["quantity.flow.cubicMeter.one"] = "m\u00B3";
            localResources["quantity.flow.cubicMeter.many"] = "m\u00B3";
            localResources["quantity.flow.cubicMeter.decimal"] = "m\u00B3";
            localResources["quantity.rotation.cumulativeRotations.one"] = "ot";
            localResources["quantity.rotation.cumulativeRotations.many"] = "ot";
            localResources["quantity.rotation.cumulativeRotations.decimal"] = "ot";
            localResources["number.modifier.thousand.one"] = "tisíc";
            localResources["number.modifier.thousand.many"] = "tisíc";
            localResources["number.modifier.thousand.decimal"] = "tisíc";
            localResources["number.modifier.million.one"] = "milion";
            localResources["number.modifier.million.many"] = "milionů";
            localResources["number.modifier.million.decimal"] = "milionů";
            localResources["number.modifier.billion.one"] = "miliarda";
            localResources["number.modifier.billion.many"] = "miliard";
            localResources["number.modifier.billion.decimal"] = "miliard";
            localResources["number.modifier.thousand.short"] = "tis.";
            localResources["number.modifier.million.short"] = "mil.";
            localResources["number.modifier.billion.short"] = "mld.";
            Localization.Cultures = Localization.Cultures || {};
            Localization.Cultures[culture] = {
                Name: culture,
                LocalizeNumber: function (value, options) {
                    if (options === void 0) { options = {}; }
                    var localizeValueModifier = function (value, modifier) {
                        var valueCountability = GetValueCountability(value);
                        return modifier ?
                            localResources["number.modifier." + modifier + "." +
                                (options.UseShortWordModifier ? "short" : valueCountability)] :
                            null;
                    };
                    var localizeUnits = function (quantityType, unitName, unitsValueCountability) {
                        return localResources["quantity." + options.QuantityType + "." + unitName + "." + unitsValueCountability];
                    };
                    return Localization.Generic.LocalizeNumberInternal(value, options, GetValueCountability, localizeValueModifier, localizeUnits);
                }
            };
            function GetValueCountability(value) {
                return value % 1 ? "decimal" :
                    value === 1 ? "one" :
                        "many";
            }
        })(Localization = View.Localization || (View.Localization = {}));
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        var Localization;
        (function (Localization) {
            "use strict";
            var culture = "en-US";
            Localization.Resources = Localization.Resources || {};
            Localization.Resources[culture] = {};
            Localization.Resources[culture]["quantity.dewPoint.degreesCelsius"] = "°C";
            Localization.Resources[culture]["quantity.rate.pieces"] = "pcs";
            Localization.Resources[culture]["quantity.rate.piecesPerMinute"] = "pcs/min";
            Localization.Resources[culture]["quantity.speed.meters"] = "m";
            Localization.Resources[culture]["quantity.speed.metersPerMinute"] = "m/min";
            Localization.Resources[culture]["quantity.temperature.degreesCelsius"] = "°C";
            Localization.Resources[culture]["quantity.stroke.dash"] = "-";
            Localization.Resources[culture]["quantity.stroke.dashPerMinute"] = "-/min";
            Localization.Resources[culture]["quantity.power.wattMinutes"] = "Wm";
            Localization.Resources[culture]["quantity.power.watts"] = "W";
            Localization.Resources[culture]["quantity.power.wattHours"] = "Wh";
            Localization.Resources[culture]["quantity.power.kilowattHours"] = "kWh";
            Localization.Resources[culture]["quantity.power.kilowatts"] = "kW";
            Localization.Resources[culture]["metric.Production.name"] = "Production";
            Localization.Resources[culture]["metric.Uptime.name"] = "Uptime";
            Localization.Resources[culture]["number.thousandsSeparator"] = ",";
            Localization.Resources[culture]["number.decimalSeparator"] = ".";
            Localization.Resources[culture]["quantity.flow.cubicMeter"] = "m\u00B3";
            Localization.Resources[culture]["quantity.flow.cubicMeterPerMinute"] = "m\u00B3/min";
            Localization.Resources[culture]["quantity.workload.percent"] = "%";
            Localization.Resources[culture]["quantity.rotation.cumulativeRotations"] = "rev";
            Localization.Resources[culture]["quantity.rotation.rotationsPerMinute"] = "rpm";
            var localResources = {};
            localResources["quantity.speed.meters.one"] = "m";
            localResources["quantity.speed.meters.many"] = "m";
            localResources["quantity.rate.pieces.one"] = "pc";
            localResources["quantity.rate.pieces.many"] = "pcs";
            localResources["quantity.stroke.dash.one"] = null;
            localResources["quantity.stroke.dash.many"] = null;
            localResources["quantity.power.wattMinutes.one"] = "Wm";
            localResources["quantity.power.wattMinutes.many"] = "Wm";
            localResources["quantity.power.wattHours.one"] = "Wh";
            localResources["quantity.power.wattHours.many"] = "Wh";
            localResources["quantity.power.kilowattHours.one"] = "kWh";
            localResources["quantity.power.kilowattHours.many"] = "kWh";
            localResources["quantity.flow.cubicMeter.one"] = "m\u00B3";
            localResources["quantity.flow.cubicMeter.many"] = "m\u00B3";
            localResources["quantity.flow.cubicMeter.decimal"] = "m\u00B3";
            localResources["quantity.rotation.cumulativeRotations.one"] = "rev";
            localResources["quantity.rotation.cumulativeRotations.many"] = "rev";
            localResources["quantity.rotation.cumulativeRotations.decimal"] = "rev";
            localResources["number.modifier.thousand"] = "thousand";
            localResources["number.modifier.million"] = "million";
            localResources["number.modifier.billion"] = "billion";
            localResources["number.modifier.thousand.short"] = "ths.";
            localResources["number.modifier.million.short"] = "mil.";
            localResources["number.modifier.billion.short"] = "bil.";
            Localization.Cultures = Localization.Cultures || {};
            Localization.Cultures[culture] = {
                Name: culture,
                LocalizeNumber: function (value, options) {
                    if (options === void 0) { options = {}; }
                    var localizeValueModifier = function (value, modifier) {
                        return modifier ?
                            localResources["number.modifier." + modifier +
                                (options.UseShortWordModifier ? ".short" : "")] :
                            null;
                    };
                    var localizeUnits = function (quantityType, unitName, unitsValueCountability) {
                        return localResources["quantity." + options.QuantityType + "." + unitName + "." + unitsValueCountability];
                    };
                    return Localization.Generic.LocalizeNumberInternal(value, options, GetValueCountability, localizeValueModifier, localizeUnits);
                }
            };
            function GetValueCountability(value) {
                return value === 1 ? "one" :
                    "many";
            }
        })(Localization = View.Localization || (View.Localization = {}));
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        var Localization;
        (function (Localization) {
            "use strict";
            /** Cultures dictionary.
             */
            Localization.Cultures = Localization.Cultures || {};
            /** Internal variable for selected culture.
             */
            var culture;
            Object.defineProperty(Localization, "Culture", {
                get: function () { return culture || Localization.Cultures["en-US"]; },
                set: function (value) { return culture = value; }
            });
            /** Global object that contains cultures with resources.
             */
            Localization.Resources = Localization.Resources || {};
            /** Localize given resource, using Resources object. Return given resource, if localization is not found.
             */
            function Localize(resource) {
                var cultureResources = Localization.Resources[Localization.Culture.Name];
                if (!cultureResources) {
                    return resource;
                }
                var localized = cultureResources[resource];
                if (!(resource in cultureResources)) {
                    return resource;
                }
                return localized;
            }
            Localization.Localize = Localize;
            /** Select culture by culture name. Default culture is en-US.
             * @return Selected culture. May be default culture, if given culture does not exist.
             */
            function SelectCulture(name) {
                return Localization.Culture = Localization.Cultures[name];
            }
            Localization.SelectCulture = SelectCulture;
        })(Localization = View.Localization || (View.Localization = {}));
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
        /** Quantity types for the measurements.
         */
        View.MeasurementQuantityTypes = {
            "dewPoint": {
                TimeDependentUnit: "degreesCelsius"
            },
            "rate": {
                CumulativeUnit: "pieces",
                TimeDependentUnit: "piecesPerMinute"
            },
            "speed": {
                CumulativeUnit: "meters",
                TimeDependentUnit: "metersPerMinute"
            },
            "temperature": {
                TimeDependentUnit: "degreesCelsius"
            },
            "stroke": {
                CumulativeUnit: "dash",
                TimeDependentUnit: "dashPerMinute"
            },
            "power": {
                CumulativeUnit: "wattHours",
                TimeDependentUnit: "watts",
                AlternativeUnits: {
                    "wattMinutes": { ConvertFromDefault: function (n) { return n * 60; } },
                    "kilowattHours": { ConvertFromDefault: function (n) { return n / 1000; } }
                }
            },
            "flow": {
                CumulativeUnit: "cubicMeter",
                TimeDependentUnit: "cubicMeterPerMinute"
            },
            "workload": {
                TimeDependentUnit: "percent"
            },
            "rotation": {
                CumulativeUnit: "cumulativeRotations",
                TimeDependentUnit: "rotationsPerMinute"
            }
        };
        var Localization;
        (function (Localization) {
            /** Helper method for localizing a quantity unit. Uses Localize method for the translation.
             */
            function LocalizeMeasurementQuantityUnit(quantityType, unitType, alternativeUnitName) {
                var alternativeUnit = quantityType && alternativeUnitName &&
                    View.MeasurementQuantityTypes[quantityType] &&
                    View.MeasurementQuantityTypes[quantityType].AlternativeUnits[alternativeUnitName];
                var unitName = alternativeUnit && alternativeUnitName ||
                    quantityType && unitType &&
                        View.MeasurementQuantityTypes[quantityType] &&
                        View.MeasurementQuantityTypes[quantityType][unitType];
                if (!unitName) {
                    return null;
                }
                return Localization.Localize("quantity." + quantityType + "." + unitName);
            }
            Localization.LocalizeMeasurementQuantityUnit = LocalizeMeasurementQuantityUnit;
        })(Localization = View.Localization || (View.Localization = {}));
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
        /** Time chart series which use MeasurementTimeSeriesAggregationProvider for data fetching.
         */
        var MeasurementTimeChartSeries = (function () {
            /** Initialize new instance of MeasurementTimeChartSeries.
             * @param {Data.MeasurementTimeSeriesAggregationProvider} provider Measurement data provider.
             * @param {number} measurementId Measurement identificator.
             * @param getView View for data fetching.
             */
            function MeasurementTimeChartSeries(provider, measurementId, getView) {
                if (getView === void 0) { getView = function () { return View.MeasurementTimeSeriesAggregationViews[0]; }; }
                this.provider = provider;
                this.measurementId = measurementId;
                this.getView = getView;
                /** Configuration of the chart series.
                 */
                this.Config = {
                    FillStyle: "rgba(90, 180, 255, 0.6)",
                    StrokeStyle: "#008bff",
                    LineWidth: 2,
                    YMin: 0
                };
            }
            /** Get time range limits for this series. This implementation returns "From": null, "To": current time.
             */
            MeasurementTimeChartSeries.prototype.GetTimeRangeLimits = function () {
                return { From: null, To: moment() };
            };
            /** Fetch data using data provider.
             * @return Promise that provides series renderer if Fetch succeeds.
             */
            MeasurementTimeChartSeries.prototype.Fetch = function (from, to) {
                var _this = this;
                var deferred = jQuery.Deferred();
                var view = this.getView();
                var alignedRange = MeasurementTimeChartSeries.AlignAndExtendFetchRange(from, to, view);
                var fetch = this.provider.Fetch({
                    From: alignedRange.From,
                    To: alignedRange.To,
                    MeasurementId: this.measurementId,
                    View: view.Id
                });
                fetch.fail(function () { return deferred.reject(); });
                fetch.progress(function (apiResult) {
                    deferred.notify(_this.CreateResultFromApiResponse(apiResult, from, to, view));
                });
                fetch.done(function (apiResult) {
                    deferred.resolve(_this.CreateResultFromApiResponse(apiResult, from, to, view));
                });
                deferred.fail(function () { return _this.provider.Cancel(fetch); });
                return Plantyst.CancellableJQueryPromiseFromDeferred(deferred);
            };
            /** Align fetch range to point boundary. Add extra data point to the end.
             */
            MeasurementTimeChartSeries.AlignAndExtendFetchRange = function (from, to, view) {
                var fromMs = from.valueOf();
                var toMs = to.valueOf();
                fromMs -= fromMs % view.PointDuration;
                var toMsRemainder = toMs % view.PointDuration;
                if (toMsRemainder > 0) {
                    toMs = toMs - toMsRemainder + view.PointDuration;
                }
                toMs += view.PointDuration;
                return { From: moment(fromMs), To: moment(toMs) };
            };
            /** Create series renderer from API response and requested time range.
             */
            MeasurementTimeChartSeries.prototype.CreateResultFromApiResponse = function (apiResult, from, to, view) {
                if (!apiResult.Data || apiResult.Data.length === 0 || !apiResult.From) {
                    return {
                        Draw: function (element, yMin, yMax, options) {
                            // do nothing
                        },
                        GetYRange: function (from, to) { return null; },
                        GetDataTimeRange: function () { return null; },
                        GetPointInfo: function () { return null; }
                    };
                }
                else {
                    var data = apiResult.Values;
                    var dataFrom = apiResult.From.valueOf();
                    var wndFrom = from.valueOf();
                    var wndTo = to.valueOf();
                    return new View.MeasurementTimeChartSeriesRenderer(data, apiResult.From, dataFrom, wndFrom, wndTo, view, this.Config);
                }
            };
            return MeasurementTimeChartSeries;
        }());
        View.MeasurementTimeChartSeries = MeasurementTimeChartSeries;
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
        /** Measurement time chart series renderer.
         */
        var MeasurementTimeChartSeriesRenderer = (function () {
            /** Initialize instance of MeasurementTimeChartSeriesRenderer.
             */
            function MeasurementTimeChartSeriesRenderer(data, dataFromMoment, dataFrom, wndFrom, wndTo, view, config) {
                this.data = data;
                this.dataFromMoment = dataFromMoment;
                this.dataFrom = dataFrom;
                this.wndFrom = wndFrom;
                this.wndTo = wndTo;
                this.view = view;
                this.config = config;
            }
            /** Draw series data onto HTML element.
             * @param {HTMLElement} element HTML element that will used for drawing. Usually canvas or SVG element.
             * @param {number} yMin Minimum value on Y scale. Cannot be null.
             * @param {number} yMax Maximum value on Y scale. Cannot be null.
             * @param {any} options Options for drawing. Used for example for passing drawing scale.
             */
            MeasurementTimeChartSeriesRenderer.prototype.Draw = function (element, yMin, yMax, options) {
                this.DrawData(element, options, [yMin, yMax]);
            };
            /** Get minimum and maximum value from data values.
             */
            MeasurementTimeChartSeriesRenderer.prototype.GetYRange = function (from, to) {
                var fromMs = from.valueOf();
                var toMs = to.valueOf();
                if (fromMs < this.wndFrom) {
                    fromMs = this.wndFrom;
                }
                if (toMs > this.wndTo) {
                    toMs = this.wndTo;
                }
                var timeOffset = MeasurementTimeChartSeriesRenderer
                    .GetTimeOffset(this.dataFrom, fromMs, toMs);
                var indexRange = MeasurementTimeChartSeriesRenderer
                    .GetIndexRange(this.data.length, this.dataFrom, timeOffset, this.view.PointDuration);
                return this.GetYRangeImpl(indexRange);
            };
            /** Get data value range from given index range.
             */
            MeasurementTimeChartSeriesRenderer.prototype.GetYRangeImpl = function (indexRange) {
                var indexFrom = Math.floor(indexRange[0]);
                var indexTo = Math.ceil(indexRange[1]);
                if (indexFrom === indexTo) {
                    return { YMin: null, YMax: null };
                }
                var yMin = this.config.YMin != null ? this.config.YMin : this.data[indexFrom];
                var yMax = this.data[indexFrom];
                for (var i = indexFrom; i <= indexTo; i++) {
                    var y = this.data[i];
                    if (yMin == null || y < yMin) {
                        yMin = y;
                    }
                    if (yMax == null || y > yMax) {
                        yMax = y;
                    }
                }
                return { YMin: yMin, YMax: yMax };
            };
            /** Get minimum and maximum time of the data.
             */
            MeasurementTimeChartSeriesRenderer.prototype.GetDataTimeRange = function () {
                return {
                    From: this.dataFromMoment,
                    To: this.dataFromMoment.clone().add(this.data.length * this.view.PointDuration)
                };
            };
            /** Get data point info for given data index.
             */
            MeasurementTimeChartSeriesRenderer.prototype.GetDataPointInfo = function (index) {
                if (index >= this.data.length || index < 0) {
                    return null;
                }
                return {
                    Time: moment(this.dataFrom + index * this.view.PointDuration),
                    Value: this.data[index]
                };
            };
            /** Get point info for given time.
             */
            MeasurementTimeChartSeriesRenderer.prototype.GetPointInfo = function (point) {
                var pointMs = point.valueOf();
                var offsetMs = (pointMs - this.dataFrom);
                var pointIndex = Math.floor(offsetMs / this.view.PointDuration);
                var left = this.GetDataPointInfo(pointIndex);
                var right = this.GetDataPointInfo(pointIndex + 1);
                var approx = null;
                var leftHasValue = left && left.Value != null;
                var rightHasValue = right && right.Value != null;
                if (leftHasValue && rightHasValue) {
                    var remainder = offsetMs % this.view.PointDuration;
                    var leftRghtRatio = remainder / this.view.PointDuration;
                    approx = {
                        Time: point,
                        Value: left.Value + (right.Value - left.Value) * leftRghtRatio
                    };
                    return {
                        ClosestLeftDataPoint: left,
                        ApproximatedDataPoint: approx,
                        ClosestRightDataPoint: right
                    };
                }
                else if (left || right) {
                    approx = {
                        Time: point,
                        Value: null
                    };
                    return {
                        ClosestLeftDataPoint: left,
                        ApproximatedDataPoint: approx,
                        ClosestRightDataPoint: right
                    };
                }
                else {
                    return null;
                }
            };
            /** Draw the series. Currently supports only canvas as a taret element.
             */
            MeasurementTimeChartSeriesRenderer.prototype.DrawData = function (element, options, yDomainRange) {
                var timeOffset = MeasurementTimeChartSeriesRenderer.GetTimeOffset(this.dataFrom, this.wndFrom, this.wndTo);
                var indexRange = MeasurementTimeChartSeriesRenderer.GetIndexRange(this.data.length, this.dataFrom, timeOffset, this.view.PointDuration);
                if (element instanceof HTMLCanvasElement) {
                    var scale = options && typeof (options.scale) === "number" ? options.scale : 1;
                    var canvas = element;
                    var ctx = canvas.getContext("2d");
                    var width = canvas.width;
                    var height = canvas.height;
                    var drawFrom = timeOffset[0] / this.view.PointDuration;
                    var wndRange = (this.wndTo - this.wndFrom) / this.view.PointDuration;
                    var drawTo = drawFrom + wndRange;
                    var xScale = d3.scale.linear().range([0, width / scale]).domain([drawFrom, drawTo]);
                    var yPixelRange = [height, 0];
                    yPixelRange[0] /= scale;
                    yPixelRange[1] /= scale;
                    var yScale = d3.scale.linear().range(yPixelRange).domain(yDomainRange);
                    this.DrawPath(ctx, xScale, yScale, indexRange[0], indexRange[1]);
                }
            };
            /** Draw a path (outline and area).
             */
            MeasurementTimeChartSeriesRenderer.prototype.DrawPath = function (ctx, xScale, yScale, fromIndex, toIndex, indexPadding) {
                if (indexPadding === void 0) { indexPadding = 5; }
                fromIndex = Math.floor(fromIndex) - indexPadding;
                toIndex = Math.ceil(toIndex) + indexPadding;
                if (fromIndex < 0) {
                    fromIndex = 0;
                }
                if (toIndex >= this.data.length) {
                    toIndex = this.data.length - 1;
                }
                for (var i = fromIndex; i <= toIndex; i++) {
                    var value = this.data[i];
                    if (value == null) {
                        continue;
                    }
                    ctx.beginPath();
                    ctx.moveTo(xScale(i), yScale(0));
                    ctx.lineTo(xScale(i), yScale(value));
                    for (i++; i <= toIndex; i++) {
                        value = this.data[i];
                        if (value == null) {
                            break;
                        }
                        ctx.lineTo(xScale(i), yScale(value));
                    }
                    ctx.lineTo(xScale(i - 1), yScale(0));
                    ctx.closePath();
                    ctx.fillStyle = this.config.FillStyle;
                    ctx.fill();
                }
                var yStrokePadding = (this.config.LineWidth) / 2;
                var yRange = yScale.range();
                yScale.range([yRange[0] - yStrokePadding, yRange[1] + yStrokePadding]);
                for (var i2 = fromIndex; i2 <= toIndex; i2++) {
                    var value2 = this.data[i2];
                    if (value2 == null) {
                        continue;
                    }
                    ctx.beginPath();
                    ctx.moveTo(xScale(i2), yScale(value2));
                    for (i2++; i2 <= toIndex; i2++) {
                        value2 = this.data[i2];
                        if (value2 == null) {
                            break;
                        }
                        ctx.lineTo(xScale(i2), yScale(value2));
                    }
                    ctx.strokeStyle = this.config.StrokeStyle;
                    ctx.lineWidth = this.config.LineWidth;
                    ctx.stroke();
                }
            };
            /** Get time offsets of window bounds form data bounds.
             */
            MeasurementTimeChartSeriesRenderer.GetTimeOffset = function (dataFrom, wndFrom, wndTo) {
                var timeOffsetFrom = wndFrom - dataFrom;
                var timeOffsetTo = wndTo - dataFrom;
                return [timeOffsetFrom, timeOffsetTo];
            };
            /** Get data array index range from time offsets.
             */
            MeasurementTimeChartSeriesRenderer.GetIndexRange = function (dataLength, dataFrom, timeOffset, pointDuration) {
                var indexFrom = timeOffset[0] / pointDuration;
                var indexTo = timeOffset[1] / pointDuration;
                if (indexFrom < 0) {
                    indexFrom = 0;
                }
                else if (indexFrom >= dataLength) {
                    indexFrom = dataLength - 1;
                }
                if (indexTo < 0) {
                    indexTo = 0;
                }
                else if (indexTo >= dataLength) {
                    indexTo = dataLength - 1;
                }
                return [indexFrom, indexTo];
            };
            return MeasurementTimeChartSeriesRenderer;
        }());
        View.MeasurementTimeChartSeriesRenderer = MeasurementTimeChartSeriesRenderer;
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
        /** Measurement data view provider.
         */
        var MeasurementTimeSeriesAggregationViewProvider = (function () {
            /** Construct new instance of MeasurementTimeChartSeriesAggregationViewProvider.
             * @param views View definitions that will be used for calculation of TimeRangeViews.
             */
            function MeasurementTimeSeriesAggregationViewProvider(views) {
                if (views === void 0) { views = View.MeasurementTimeSeriesAggregationViews; }
                this.views = views;
                /** Current time ranges.
                 */
                this.timeRanges = [];
                /** Indicates whether the time ranges have changed, and views need to be updated.
                 */
                this.timeRangesChanged = false;
                /** Views for time ranges, matched to time ranges by array index.
                 */
                this.timeRangeViews = [];
                /** Indexes of views for time ranges. Index is index of time range. Value is index of view.
                 */
                this.timeRangeViewIndexes = [];
            }
            Object.defineProperty(MeasurementTimeSeriesAggregationViewProvider.prototype, "TimeRangeViews", {
                /** Get views for time ranges.
                 */
                get: function () {
                    this.UpdateTimeRangeViews();
                    return this.timeRangeViews;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(MeasurementTimeSeriesAggregationViewProvider.prototype, "TimeRanges", {
                /** Current time ranges.
                 */
                get: function () {
                    return this.timeRanges;
                },
                /** Current time ranges setter.
                 */
                set: function (timeRanges) {
                    this.timeRanges = timeRanges;
                    this.timeRangesChanged = true;
                },
                enumerable: true,
                configurable: true
            });
            /** Update views for current time ranges.
             */
            MeasurementTimeSeriesAggregationViewProvider.prototype.UpdateTimeRangeViews = function () {
                var _this = this;
                if (!this.timeRangesChanged) {
                    return;
                }
                var newTimeRangeViews = [];
                var newTimeRangeViewIndexes = [];
                this.timeRanges.forEach(function (timeRange, timeRangeIndex) {
                    var durationMs = timeRange.To.valueOf() - timeRange.From.valueOf();
                    var views = _this.views;
                    var viewIndex = _this.timeRangeViewIndexes[timeRangeIndex] || 0;
                    var view = views[viewIndex];
                    for (var i = 0; i < views.length; i++) {
                        var w = views[i];
                        var min = w.TimeRangeDurationMinimum;
                        var max = w.TimeRangeDurationMaximum;
                        if ((!min || durationMs >= min) && (!max || durationMs <= max)) {
                            view = w;
                            viewIndex = i;
                            break;
                        }
                    }
                    newTimeRangeViews[timeRangeIndex] = View.MeasurementTimeSeriesAggregationViews[viewIndex];
                    newTimeRangeViewIndexes[timeRangeIndex] = viewIndex;
                });
                this.timeRangeViews = newTimeRangeViews;
                this.timeRangeViewIndexes = newTimeRangeViewIndexes;
                this.timeRangesChanged = false;
            };
            /** Range change listener.
             */
            MeasurementTimeSeriesAggregationViewProvider.prototype.OnTimeRangesChanging = function (timeRanges) {
                this.TimeRanges = timeRanges;
            };
            /** Range change listener.
             */
            MeasurementTimeSeriesAggregationViewProvider.prototype.OnTimeRangesChanged = function (timeRanges) {
                this.TimeRanges = timeRanges;
            };
            return MeasurementTimeSeriesAggregationViewProvider;
        }());
        View.MeasurementTimeSeriesAggregationViewProvider = MeasurementTimeSeriesAggregationViewProvider;
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
        /** Available aggregation views.
         */
        View.MeasurementTimeSeriesAggregationViews = [
            {
                Id: "Base.MinuteSet",
                PointDuration: 60000,
                TimeRangeDurationMinimum: null,
                TimeRangeDurationMaximum: 172800000 // 2 days
            }, {
                Id: "Base.Hour",
                PointDuration: 3600000,
                TimeRangeDurationMinimum: 155520000,
                TimeRangeDurationMaximum: 7776000000 // 90 days
            }, {
                Id: "Base.Day",
                PointDuration: 86400000,
                TimeRangeDurationMinimum: 6912000000,
                TimeRangeDurationMaximum: null
            }
        ];
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
        /** Y value axis, implemented using HTML SVG.
         */
        var SvgValueAxis = (function () {
            /** Construct new instance of SvgValueAxis.
             * @param valueRangeIndex Index of value range which this axis displays.
             */
            function SvgValueAxis(isOnLeftSide) {
                if (isOnLeftSide === void 0) { isOnLeftSide = false; }
                this.isOnLeftSide = isOnLeftSide;
                /** Ticks with their positions.
                 */
                this.ticks = [];
            }
            /** Bind to SVG element.
             */
            SvgValueAxis.prototype.BindToSvg = function (svg) {
                this.d3svg = d3.select(svg);
                this.d3g = this.d3svg.append("g");
                this.d3line1 = this.d3g.append("line")
                    .attr("class", "line")
                    .attr("stroke-width", 1)
                    .attr("stroke", "black");
                this.d3line2 = this.d3g.append("line")
                    .attr("class", "line")
                    .attr("stroke-width", 1)
                    .attr("stroke", "black");
                this.ApplyLayout();
            };
            /** Unbind from SVG element.
             */
            SvgValueAxis.prototype.UnbindFromSvg = function () {
                this.d3svg = null;
                this.d3g = null;
                this.d3line1 = null;
                this.d3line2 = null;
            };
            /** Set various sizes and counts, that affect layout of the axis.
             */
            SvgValueAxis.prototype.SetLayout = function (width, height, axisOffsetTop, axisHeight, scaleOffsetTop, scaleHeight, tickCount) {
                this.layout = { width: width, height: height, axisOffsetTop: axisOffsetTop, axisHeight: axisHeight, scaleOffsetTop: scaleOffsetTop, scaleHeight: scaleHeight, tickCount: tickCount };
                var tickLength = (this.layout.scaleHeight) / (this.layout.tickCount - 1);
                if (this.d3svg != null) {
                    this.ticks.forEach(function (tick) { return tick.Element.remove(); });
                }
                this.ticks = [];
                for (var i = 0; i < this.layout.tickCount; i++) {
                    var tickPosition = i * tickLength;
                    this.ticks.push({ Element: null, Position: tickPosition });
                }
                this.TickPositionsChanged();
                this.ApplyLayout();
            };
            /** Apply layout to HTML elements.
             */
            SvgValueAxis.prototype.ApplyLayout = function () {
                var _this = this;
                if (this.layout == null || this.d3svg == null) {
                    return;
                }
                this.d3svg.attr({ width: this.layout.width, height: this.layout.height });
                if (this.isOnLeftSide) {
                    this.d3line1
                        .attr("x1", this.layout.width - 1)
                        .attr("x2", this.layout.width - 1);
                    this.d3line2
                        .attr("x1", this.layout.width - 10)
                        .attr("x2", this.layout.width - 2);
                }
                else {
                    this.d3line1
                        .attr("x1", 0)
                        .attr("x2", 0);
                    this.d3line2
                        .attr("x1", 0)
                        .attr("x2", 8);
                }
                this.d3line1
                    .attr("y1", this.layout.axisOffsetTop)
                    .attr("y2", this.layout.axisOffsetTop + this.layout.axisHeight);
                this.d3line2
                    .attr("y1", this.layout.axisOffsetTop)
                    .attr("y2", this.layout.axisOffsetTop);
                this.ticks.forEach(function (p) {
                    if (p.Element != null) {
                        p.Element.remove();
                    }
                    var tick;
                    if (_this.isOnLeftSide) {
                        tick = _this.d3g.append("text")
                            .attr("fill", "black")
                            .attr("x", _this.layout.width - 5)
                            .attr("text-anchor", "end");
                    }
                    else {
                        tick = _this.d3g.append("text")
                            .attr("fill", "black")
                            .attr("x", "5");
                    }
                    tick.attr("y", _this.layout.scaleOffsetTop + p.Position);
                    p.Element = tick;
                });
                if (this.valueRange) {
                    this.UpdateTickLabels();
                }
            };
            /** Represents value range change listener.
             * @param {IValueRange[]} valueRanges A list of data ranges.
             */
            SvgValueAxis.prototype.OnValueRangeChanging = function (valueRange) {
                this.valueRange = valueRange;
                this.UpdateTickLabels();
            };
            /** Represents value range change listener.
             * @param {IValueRange[]} valueRanges A list of data ranges.
             */
            SvgValueAxis.prototype.OnValueRangeChanged = function (valueRange) {
                this.valueRange = valueRange;
                this.UpdateTickLabels();
            };
            /** Update labels of the ticks on the scale.
             * @param valueRange Value range to be used for calculation of label texts.
             */
            SvgValueAxis.prototype.UpdateTickLabels = function () {
                if (this.d3svg == null) {
                    return;
                }
                var valueRange = this.valueRange;
                var scale = d3.scale.linear().range([this.layout.scaleHeight, 0]).domain([valueRange.Min, valueRange.Max]);
                var roundValue;
                var range = Math.abs(valueRange.Max - valueRange.Min);
                if (range < 1) {
                    roundValue = 100;
                }
                else if (range < 10) {
                    roundValue = 10;
                }
                else {
                    roundValue = 1;
                }
                this.ticks.forEach(function (tick) {
                    tick.Element.text(Math.round(scale.invert(tick.Position) * roundValue) / roundValue);
                });
            };
            /** Override this method to receive notifications about tick position changes.
             */
            SvgValueAxis.prototype.TickPositionsChanged = function () {
                ;
            };
            /** Return a list of tick positions on the axis (in pixels). The positions are relative to the chart area.
             */
            SvgValueAxis.prototype.GetTickPositions = function () {
                return this.ticks.map(function (tick) { return tick.Position; });
            };
            return SvgValueAxis;
        }());
        View.SvgValueAxis = SvgValueAxis;
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
        /** Time axis ticks generator.
         */
        var TimeAxisTicksGenerator = (function () {
            function TimeAxisTicksGenerator() {
                /** English IANA time zone name.
                 */
                this.IanaTimeZone = null;
                /** Maximum number generated ticks (excluding subticks).
                 */
                this.MaxTicksCount = 0;
            }
            /** Generate initial tick.
             */
            TimeAxisTicksGenerator.prototype.GenerateFirstTick = function (tickInterval, from, to) {
                var tickTime = from - 3 * tickInterval; // put the first tick in past to avoid issues with DST changes
                var tickMoment = moment.tz(tickTime, this.IanaTimeZone);
                var tickZoneRaw = tickMoment.utcOffset();
                var tickZone = tickZoneRaw * 60000;
                // round to tick interval
                var remainder = (tickTime + tickZone) % tickInterval;
                if (remainder) {
                    tickTime -= remainder;
                    tickMoment = moment.tz(tickTime, this.IanaTimeZone);
                    tickZoneRaw = tickMoment.utcOffset();
                    tickZone = tickZoneRaw * 60000;
                }
                var behindRange = tickTime > to;
                var visible = tickTime >= from && !behindRange;
                return {
                    Enabled: true, IsSubtick: false, Ms: tickTime, Moment: tickMoment,
                    Zone: tickZone, ZoneRaw: tickZoneRaw, BehindRange: behindRange,
                    InRange: visible
                };
            };
            /** Generate next tick from given parameters.
             */
            TimeAxisTicksGenerator.prototype.GenerateNextTick = function (ticks, tickInterval, from, to) {
                var prevTick = ticks[ticks.length - 1];
                var tickTime = prevTick.Ms + tickInterval;
                var tickMoment = moment.tz(tickTime, this.IanaTimeZone);
                var tickZoneRaw = tickMoment.utcOffset();
                var tickZone = tickZoneRaw * 60000;
                var tickZoneChanged = tickZone !== prevTick.Zone;
                var oneHour = 3600000;
                if (tickZoneChanged && tickInterval > oneHour) {
                    // round to tick interval
                    var remainder = (tickTime + tickZone) % tickInterval;
                    if (remainder) {
                        tickTime -= remainder;
                        tickMoment = moment.tz(tickTime, this.IanaTimeZone);
                        tickZoneRaw = tickMoment.utcOffset();
                        tickZone = tickZoneRaw * 60000;
                    }
                }
                var behindRange = tickTime > to;
                var visible = tickTime >= from && !behindRange;
                return {
                    Enabled: true, IsSubtick: false, Ms: tickTime, Moment: tickMoment,
                    Zone: tickZone, ZoneRaw: tickZoneRaw, BehindRange: behindRange,
                    InRange: visible
                };
            };
            /** Generate ticks for given time range.
             */
            TimeAxisTicksGenerator.prototype.Generate = function (timeRange) {
                var from = timeRange.From.valueOf();
                var to = timeRange.To.valueOf();
                var length = to - from;
                var pointsCount = length;
                var tickDurationUnits = 1;
                var tickDurationMs = 1;
                var unitIndex;
                var unitCountIndex;
                for (var i = 0; i < TimeAxisTicksGenerator.units.length && pointsCount > this.MaxTicksCount; i++) {
                    unitIndex = i;
                    var unitTicks = TimeAxisTicksGenerator.unitsTicks[i];
                    var tickDurations = TimeAxisTicksGenerator.ticksDurations[i];
                    for (var j = 0; j < tickDurations.length && pointsCount > this.MaxTicksCount; j++) {
                        unitCountIndex = j;
                        tickDurationUnits = unitTicks[j];
                        tickDurationMs = tickDurations[j];
                        pointsCount = Math.floor(length / tickDurationMs) + 1;
                    }
                }
                if (pointsCount > this.MaxTicksCount) {
                    // assume tick duration is 1 day (unitsTicks array contains [1] for day)
                    // use highest possible number of days as tick duration, but keep points count under limit
                    var ratio = Math.ceil(pointsCount / this.MaxTicksCount);
                    tickDurationUnits *= ratio;
                    tickDurationMs *= ratio;
                    pointsCount = Math.floor(pointsCount / ratio);
                }
                var tick = this.GenerateFirstTick(tickDurationMs, from, to);
                var ticks = [tick];
                // gather ticks into array
                while (!tick.BehindRange) {
                    tick = this.GenerateNextTick(ticks, tickDurationMs, from, to);
                    ticks.push(tick);
                }
                var oneHour = 3600000;
                if (tickDurationMs > oneHour) {
                    // disable ticks that are too close to other ticks
                    // irregularity of ticks happens during DST changes
                    var closenessLimit = tickDurationMs * 0.5;
                    ticks.forEach(function (tick, i, ticks) {
                        var prevTick = ticks.slice(0, i).reverse().filter(function (t) { return t.Enabled; })[0];
                        var nextTick = ticks.slice(i + 1).filter(function (t) { return t.Enabled; })[0];
                        if (!nextTick || !prevTick) {
                            return;
                        }
                        var newMoment = moment(tick.Moment).add(oneHour);
                        var newZoneRaw = newMoment.utcOffset();
                        if (newZoneRaw < tick.ZoneRaw) {
                            tick.Ms += oneHour;
                            tick.Moment = newMoment;
                            tick.ZoneRaw = newZoneRaw;
                            tick.Zone = newZoneRaw * 60000;
                            tick.IsSubtick = false;
                        }
                        if (tick.Ms - prevTick.Ms < closenessLimit || nextTick.Ms - tick.Ms < closenessLimit) {
                            tick.Enabled = false;
                        }
                    });
                }
                var subticksCount = TimeAxisTicksGenerator.unitsSubticks[unitIndex][unitCountIndex];
                if (subticksCount > 0) {
                    var subtickIntervalMs = tickDurationMs / (subticksCount + 1);
                    ticks.filter(function (tick) { return tick.Enabled; }).forEach(function (tick, i, enabledTicks) {
                        var prevTick = enabledTicks[i - 1];
                        if (!prevTick) {
                            return;
                        }
                        for (var subtickMs = tick.Ms - subtickIntervalMs; subtickMs > prevTick.Ms; subtickMs -= subtickIntervalMs) {
                            var inRange = subtickMs >= from && subtickMs <= to;
                            if (!inRange) {
                                continue;
                            }
                            var subtickMoment = moment(subtickMs);
                            var subtickZoneRaw = subtickMoment.utcOffset();
                            var subtickZone = subtickZoneRaw * 60000;
                            var behindRange = subtickMs > to;
                            var visible = subtickMs >= from && !behindRange;
                            ticks.push({
                                Enabled: true, IsSubtick: true, Ms: subtickMs, Moment: subtickMoment,
                                Zone: subtickZone, ZoneRaw: subtickZoneRaw, BehindRange: behindRange,
                                InRange: visible
                            });
                        }
                    });
                }
                return {
                    Ticks: ticks,
                    TicksDurations: TimeAxisTicksGenerator.ticksDurations,
                    TickIntervalMs: tickDurationMs,
                    RangeFromMs: from,
                    RangeToMs: to
                };
            };
            return TimeAxisTicksGenerator;
        }());
        /** Counts of units that make bigger units.
         */
        TimeAxisTicksGenerator.units = [1, 1000, 60, 60, 24];
        /** Unit milliseconds, for second, minute, hour, day.
         */
        TimeAxisTicksGenerator.unitsMs = [1, 1000, 1000 * 60, 1000 * 60 * 60, 1000 * 60 * 60 * 24];
        /** Divisors of unit with 24 values.
         */
        TimeAxisTicksGenerator.divisors24 = [1, 2, 3, 4, 6, 8, 12];
        /** Divisors of unit with 60 values.
         */
        TimeAxisTicksGenerator.divisors60 = [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30];
        /** Divisors of unit with 1000 values.
         */
        TimeAxisTicksGenerator.divisors1000 = [1, 2, 4, 5, 8, 10, 20, 25, 40, 50, 100, 125, 200, 250, 500];
        /** Subtick counts for hours.
         */
        TimeAxisTicksGenerator.subticks24 = [1, 1, 2, 1, 1, 1, 1];
        /** Subtick counts for minutes and seconds.
         */
        TimeAxisTicksGenerator.subticks60 = [1, 1, 2, 1, 0, 1, 1, 1, 2, 1, 1];
        /** Subtick counts for milliseconds.
         */
        TimeAxisTicksGenerator.subticks1000 = [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1];
        /** Array of tick distances, for seconds, minutes, hours, days.
         * Second level is multiple of the base unit.
         */
        TimeAxisTicksGenerator.unitsTicks = [
            TimeAxisTicksGenerator.divisors1000,
            TimeAxisTicksGenerator.divisors60,
            TimeAxisTicksGenerator.divisors60,
            TimeAxisTicksGenerator.divisors24,
            [1]
        ];
        /** Array of subtick counts, for seconds, minutes, hours, days.
         * Structure of the data matches with unitsTicks.
         */
        TimeAxisTicksGenerator.unitsSubticks = [
            TimeAxisTicksGenerator.subticks1000,
            TimeAxisTicksGenerator.subticks60,
            TimeAxisTicksGenerator.subticks60,
            TimeAxisTicksGenerator.subticks24,
            [0]
        ];
        /** Tick durations of seconds, minutes, hours, days.
         * Structure of the data matches with unitsTicks.
         */
        TimeAxisTicksGenerator.ticksDurations = TimeAxisTicksGenerator.unitsTicks.map(function (ticks, i) {
            var unitMs = TimeAxisTicksGenerator.unitsMs[i];
            return ticks.map(function (tick) { return tick * unitMs; });
        });
        View.TimeAxisTicksGenerator = TimeAxisTicksGenerator;
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
        /** Connects time range change listeners, generators and limiters together.
         * Listens for changes on generators, and when change happens, it is passed through limiters and then passed to all listeners.
         */
        var TimeChartSyncContext = (function () {
            function TimeChartSyncContext() {
                /** Chart areas on which time ranges are synchronized. They are also used as listeners, generators, and their
                 * series are used as limiters.
                 */
                this.ChartAreas = [];
                /** Time range limiters, that are applied to time ranges in time ranges change event, before the time ranges are sent to listeners.
                 */
                this.TimeRangeLimiters = [];
                /** Listeners to time range changes.
                 */
                this.ChangeListeners = [];
                /** Generators of time range changes.
                 */
                this.ChangeGenerators = [];
            }
            /** Add chart area to internal list of chart areas. The chart area is used as listener, generator and limiter (using series).
             */
            TimeChartSyncContext.prototype.AddChartArea = function (area, draw) {
                if (draw === void 0) { draw = true; }
                this.ChartAreas.push(area);
                this.AttachToGeneratorEvents(area);
                if (this.timeRanges && draw) {
                    this.timeRangesChanging = true;
                    area.DrawAsync(this.timeRanges, false);
                    this.timeRangesChanging = false;
                }
            };
            /** Remove chart area from internal list of chart areas.
             */
            TimeChartSyncContext.prototype.RemoveChartArea = function (area) {
                var index = this.ChartAreas.indexOf(area);
                if (index >= 0) {
                    this.ChartAreas.splice(index, 1);
                    this.DetachFromGeneratorEvents(area);
                }
            };
            /** Add change listener to internal list of change listeners,
             * to the end of the list.
             */
            TimeChartSyncContext.prototype.AddChangeListener = function (listener) {
                this.RemoveChangeListener(listener);
                this.ChangeListeners.push(listener);
            };
            /** Add change listener to internal list of change listeners,
             * to the beginning of the list.
             */
            TimeChartSyncContext.prototype.PrependChangeListener = function (listener) {
                this.RemoveChangeListener(listener);
                this.ChangeListeners.unshift(listener);
            };
            /** Remove change listener from internal list of change listeners.
             */
            TimeChartSyncContext.prototype.RemoveChangeListener = function (listener) {
                var index = this.ChangeListeners.indexOf(listener);
                if (index >= 0) {
                    this.ChangeListeners.splice(index, 1);
                }
            };
            /** Add change generator to internal list of change generators.
             */
            TimeChartSyncContext.prototype.AddChangeGenerator = function (generator) {
                this.RemoveChangeGenerator(generator);
                this.ChangeGenerators.push(generator);
                this.AttachToGeneratorEvents(generator);
            };
            /** Remove change generator from internal list of change generators.
             */
            TimeChartSyncContext.prototype.RemoveChangeGenerator = function (generator) {
                var index = this.ChangeGenerators.indexOf(generator);
                if (index >= 0) {
                    this.ChangeGenerators.splice(index, 1);
                    this.DetachFromGeneratorEvents(generator);
                }
            };
            /** Attach to generator events (replace interface functions with own).
             */
            TimeChartSyncContext.prototype.AttachToGeneratorEvents = function (generator) {
                var _this = this;
                generator.TimeRangesChanging = function (wnds) { return _this.SetTimeRanges(wnds, true); };
                generator.TimeRangesChanged = function (wnds) { return _this.SetTimeRanges(wnds, false); };
            };
            TimeChartSyncContext.prototype.DetachFromGeneratorEvents = function (generator) {
                generator.TimeRangesChanging = function () { ; };
                generator.TimeRangesChanged = function () { ; };
            };
            /** Add time range limiter to internal list of time range limiters.
             */
            TimeChartSyncContext.prototype.AddLimiter = function (limiter, timeRangeIndex) {
                this.TimeRangeLimiters.push({ Limiter: limiter, TimeRangeIndex: timeRangeIndex });
            };
            /** Remove time range limiter from internal list of time range limiters.
             */
            TimeChartSyncContext.prototype.RemoveLimiter = function (limiter) {
                this.TimeRangeLimiters = this.TimeRangeLimiters.filter(function (p) { return p.Limiter !== limiter; });
            };
            /** Manually set time ranges.
             * @param timeRanges Time ranges.
             * @param quick Indicates whether the change is quick (temporary and in rapid succession).
             * @param applyLimits Indicates whether the ApplyLimitsToTimeRanges should be automatically called. Default value is true.
             */
            TimeChartSyncContext.prototype.SetTimeRanges = function (timeRanges, quick, applyLimits) {
                if (quick === void 0) { quick = false; }
                if (applyLimits === void 0) { applyLimits = true; }
                if (this.timeRangesChanging) {
                    return;
                }
                this.timeRangesChanging = true;
                this.timeRanges = timeRanges;
                var changeListeners = this.ChangeListeners.concat(this.ChartAreas);
                if (applyLimits) {
                    this.ApplyLimitsToTimeRanges(timeRanges);
                }
                if (quick) {
                    changeListeners.forEach(function (listener) {
                        listener.OnTimeRangesChanging(timeRanges);
                    });
                }
                else {
                    changeListeners.forEach(function (listener) {
                        listener.OnTimeRangesChanged(timeRanges);
                    });
                }
                this.timeRangesChanging = false;
            };
            TimeChartSyncContext.prototype.GetTimeRanges = function () {
                return this.timeRanges;
            };
            /** Apply limits from limiters (including chart series) to given time ranges.
             * Original time range durations are kept where possible.
             * @param timeRanges Time ranges.
             */
            TimeChartSyncContext.prototype.ApplyLimitsToTimeRanges = function (timeRanges) {
                var timeRangesLimits = this.GetTimeRangeLimits();
                // update timeRanges
                timeRangesLimits.forEach(function (limit, timeRangeIndex) {
                    if (!limit) {
                        return;
                    }
                    var range = timeRanges[timeRangeIndex];
                    var rangeFromMs = range.From.valueOf();
                    var limitFromMs = limit.From ? limit.From.valueOf() : null;
                    var rangeToMs = range.To.valueOf();
                    var limitToMs = limit.To ? limit.To.valueOf() : null;
                    var rangeDuration = rangeToMs - rangeFromMs;
                    if (limitFromMs !== null && rangeFromMs < limitFromMs) {
                        rangeFromMs = limitFromMs;
                        rangeToMs = rangeFromMs + rangeDuration;
                    }
                    if (limitToMs !== null && rangeToMs > limitToMs) {
                        rangeToMs = limitToMs;
                        rangeFromMs = Math.max(rangeToMs - rangeDuration, limitFromMs);
                    }
                    range.From = moment(rangeFromMs);
                    range.To = moment(rangeToMs);
                });
            };
            /** Return limits from limiters (including chart series). Limits correspond with time ranges by array index.
             */
            TimeChartSyncContext.prototype.GetTimeRangeLimits = function () {
                var timeRangesLimits = [];
                var series = [];
                this.ChartAreas.forEach(function (area) { return area.Series.forEach(function (s) {
                    return series.push({ Limiter: s.Series, TimeRangeIndex: s.TimeRangeIndex });
                }); });
                // get current limits from limiters and series
                this.TimeRangeLimiters.concat(series).forEach(function (limiter) {
                    if (!timeRangesLimits[limiter.TimeRangeIndex]) {
                        timeRangesLimits[limiter.TimeRangeIndex] = [];
                    }
                    timeRangesLimits[limiter.TimeRangeIndex].push(limiter.Limiter.GetTimeRangeLimits());
                });
                // map to one limit per time range
                return timeRangesLimits.map(function (timeRangeLimits) {
                    if (!timeRangeLimits) {
                        return { From: null, To: null };
                    }
                    var limitFrom = null;
                    var limitTo = null;
                    // get smallest range from the timeRangeLimits array
                    for (var i = 0; i < timeRangeLimits.length; i++) {
                        var series = timeRangeLimits[i];
                        if (series.From === null) {
                            limitFrom = null;
                            break;
                        }
                        if (limitFrom === null || series.From < limitFrom) {
                            limitFrom = series.From;
                        }
                    }
                    for (var i2 = 0; i2 < timeRangeLimits.length; i2++) {
                        var series2 = timeRangeLimits[i2];
                        if (series2.To === null) {
                            limitTo = null;
                            break;
                        }
                        if (limitTo === null || series2.To > limitTo) {
                            limitTo = series2.To;
                        }
                    }
                    return { From: limitFrom, To: limitTo };
                });
            };
            return TimeChartSyncContext;
        }());
        View.TimeChartSyncContext = TimeChartSyncContext;
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        "use strict";
        /** Handles user interaction between HTML element and time ranges.
         * Mouse and touch events captured on HTML element are used to change time ranges.
         */
        var TimeRangeInteraction = (function () {
            function TimeRangeInteraction() {
                /** Minimum length of time range. Default value is 10 minutes.
                 */
                this.MinLength = moment.duration(10, "minutes");
                /** Maximum length of time range. Default value is null.
                 */
                this.MaxLength = null;
                /** Minimum time (boundary) of time range start. Default value is null.
                 */
                this.MinTime = null;
                /** Maximum time (boundary) of time range end. Default value is null.
                 */
                this.MaxTime = null;
                /** Flag indicating that dragging (movement to side) is in progress.
                 */
                this.dragging = false;
                /** Flag indicating that transforming (zooming) is in progress.
                 */
                this.transforming = false;
                /** Current time ranges.
                 */
                this.timeRanges = [];
                this.ignoringContinuousInput = false;
            }
            /** Stub that will be overriden by listener.
             */
            TimeRangeInteraction.prototype.TimeRangesChanging = function (timeRanges) {
                ;
            };
            /** Stub that will be overriden by listener.
             */
            TimeRangeInteraction.prototype.TimeRangesChanged = function (timeRanges) {
                ;
            };
            /** Attach user interaction to given HTML element. The element will be used to listen to mouse and touch events.
             * @param element Element to be used for pointer event listening.
             * @param getScalePxRange Pixel range of scale, relative to interaction element.
             */
            TimeRangeInteraction.prototype.AttachTo = function (element, getScalePxRange, getTimeRanges) {
                var _this = this;
                var $element = $(element);
                var getScalePagePxRange = function () {
                    var range = getScalePxRange();
                    var offset = $element.offset().left;
                    return { Start: range.Start + offset, End: range.End + offset };
                };
                $element.mousewheel(function (e) {
                    if (e.ctrlKey) {
                        e.preventDefault();
                        _this.timeRanges = getTimeRanges();
                        _this.scalePagePxRange = getScalePagePxRange();
                        var zoomFactor = Math.pow(1.25, Math.abs(e.deltaY));
                        if (e.deltaY > 0) {
                            zoomFactor = -zoomFactor;
                        }
                        _this.Zoom(e.pageX, zoomFactor);
                    }
                });
                var Hammer = window.Hammer;
                var hammerEl = new Hammer(element, { touchAction: "pan-y" });
                hammerEl.get("pinch").set({ enable: true });
                hammerEl.on("panstart", function (e) {
                    if (_this.ShouldIgnoreInput(e)) {
                        _this.ignoringContinuousInput = true;
                        return;
                    }
                    _this.ignoringContinuousInput = false;
                    _this.transforming = false;
                    _this.dragging = true;
                    _this.timeRanges = getTimeRanges();
                    _this.scalePagePxRange = getScalePagePxRange();
                    _this.HandleTouchStart(e);
                });
                hammerEl.on("pinchstart", function (e) {
                    if (_this.ShouldIgnoreInput(e)) {
                        _this.ignoringContinuousInput = true;
                        return;
                    }
                    _this.ignoringContinuousInput = false;
                    _this.transforming = true;
                    _this.dragging = false;
                    _this.timeRanges = getTimeRanges();
                    _this.scalePagePxRange = getScalePagePxRange();
                    _this.HandleTouchStart(e);
                });
                var touches = 0;
                var handleTouchEnd = function (checkTouchesCount) {
                    if (checkTouchesCount && touches > 0) {
                        return;
                    }
                    if (_this.dragging || _this.transforming) {
                        _this.dragging = false;
                        _this.transforming = false;
                        _this.TimeRangesChanged(_this.timeRanges);
                    }
                };
                $element.on("touchstart", function () {
                    touches++;
                });
                $element.on("touchend", function () {
                    touches--;
                    handleTouchEnd(true);
                });
                $element.on("touchcancel", function () {
                    touches = 0;
                    handleTouchEnd(true);
                });
                hammerEl.on("panend pinchend", function (e) {
                    if (_this.ignoringContinuousInput) {
                        return;
                    }
                    handleTouchEnd(false);
                });
                hammerEl.on("panmove", function (e) {
                    if (_this.ignoringContinuousInput) {
                        return;
                    }
                    if (!_this.dragging) {
                        return;
                    }
                    _this.HandleTouch(e);
                });
                hammerEl.on("pinchmove", function (e) {
                    if (_this.ignoringContinuousInput) {
                        return;
                    }
                    if (!_this.transforming) {
                        return;
                    }
                    _this.HandleTouch(e);
                });
            };
            /** Determine whether given event should be ignored.
             */
            TimeRangeInteraction.prototype.ShouldIgnoreInput = function (event) {
                return $(event.target).closest(".time-range-ignore-input").length > 0;
            };
            /** Handle touch start event.
             * @param scalePagePxRange Pixel range of scale, relative to page.
             */
            TimeRangeInteraction.prototype.HandleTouchStart = function (e) {
                var _this = this;
                this.timeRangesStart = this.timeRanges.map(function (wnd) { return jQuery.extend({}, wnd); });
                if (e.pointers.length === 1) {
                    this.touchesStart = [e.pointers[0].pageX - this.scalePagePxRange.Start];
                }
                else if (e.pointers.length === 2) {
                    this.touchesStart = [
                        e.pointers[0].pageX - this.scalePagePxRange.Start,
                        e.pointers[1].pageX - this.scalePagePxRange.Start
                    ];
                }
                this.touchesStart.sort(function (a, b) { return a - b; });
                this.timeRangesScalesStart = this.timeRangesStart.map(function (wnd) {
                    return d3.scale.linear().range([0, _this.scalePagePxRange.End - _this.scalePagePxRange.Start])
                        .domain([wnd.From.valueOf(), wnd.To.valueOf()]);
                });
                this.timeRangesTouchDomains = this.timeRangesScalesStart.map(function (scale) {
                    return _this.touchesStart.map(function (touch) { return scale.invert(touch); });
                });
            };
            /** Handle touch event.
             * @param scalePagePxRange Pixel range of scale, relative to page.
             */
            TimeRangeInteraction.prototype.HandleTouch = function (e) {
                var _this = this;
                var minLength = this.MinLength ? this.MinLength.asMilliseconds() : null;
                var maxLength = this.MaxLength ? this.MaxLength.asMilliseconds() : null;
                var minTime = this.MinTime ? this.MinTime.valueOf() : null;
                var maxTime = this.MaxTime ? this.MaxTime.valueOf() : null;
                var newTimeRanges = this.timeRangesStart.map(function (wnd) { return jQuery.extend({}, wnd); });
                newTimeRanges.forEach(function (wnd, i) {
                    var touchDomain = _this.timeRangesTouchDomains[i];
                    var xScaleStart = _this.timeRangesScalesStart[i];
                    var newWindowDomain = [];
                    var multiTouch = touchDomain.length === 2 && e.pointers.length === 2;
                    var singleTouch = touchDomain.length === 1 && e.pointers.length === 1;
                    var pxRangeLength = _this.scalePagePxRange.End - _this.scalePagePxRange.Start;
                    var touchCenter;
                    if (multiTouch) {
                        var touchDomainLength = touchDomain[1] - touchDomain[0];
                        var windowRangeLength = _this.scalePagePxRange.End - _this.scalePagePxRange.Start;
                        var touchRange = [
                            e.pointers[0].pageX - _this.scalePagePxRange.Start,
                            e.pointers[1].pageX - _this.scalePagePxRange.Start
                        ]
                            .sort(function (a, b) { return a - b; });
                        touchCenter = (touchRange[1] + touchRange[0]) / 2;
                        var touchRangeLength = Math.max(1, touchRange[1] - touchRange[0]);
                        newWindowDomain[0] = touchDomain[0] - (touchRange[0] / touchRangeLength) * touchDomainLength;
                        newWindowDomain[1] = touchDomain[1] + ((windowRangeLength - touchRange[1]) / touchRangeLength) * touchDomainLength;
                    }
                    else if (singleTouch) {
                        var domainOffset = wnd.From.valueOf() - xScaleStart.invert(e.deltaX);
                        var domainStart = xScaleStart.domain();
                        touchCenter = e.pointers[0].pageX - _this.scalePagePxRange.Start;
                        newWindowDomain = [domainStart[0] + domainOffset, domainStart[1] + domainOffset];
                    }
                    else {
                        return;
                    }
                    var newLength = newWindowDomain[1] - newWindowDomain[0];
                    var newLengthLimited = newLength;
                    if (maxLength && newLength > maxLength) {
                        newLengthLimited = maxLength;
                    }
                    else if (minLength && newLength < minLength) {
                        newLengthLimited = minLength;
                    }
                    if (newLength !== newLengthLimited) {
                        var ratio = touchCenter / pxRangeLength;
                        var diff = newLengthLimited - newLength;
                        newWindowDomain[0] -= diff * ratio;
                        newWindowDomain[1] += diff * (1 - ratio);
                    }
                    if (minTime && newWindowDomain[0] < minTime) {
                        newWindowDomain[1] = Math.min(newWindowDomain[1] + (minTime - newWindowDomain[0]), maxTime);
                        newWindowDomain[0] = minTime;
                    }
                    if (maxTime && newWindowDomain[1] > maxTime) {
                        newWindowDomain[0] = Math.max(newWindowDomain[0] - (newWindowDomain[1] - maxTime), minTime);
                        newWindowDomain[1] = maxTime;
                    }
                    wnd.From = moment(newWindowDomain[0]);
                    wnd.To = moment(newWindowDomain[1]);
                });
                this.timeRanges = newTimeRanges;
                this.TimeRangesChanging(this.timeRanges);
            };
            /** Zoom in/out time ranges.
             * @param pageXOffset Pixel offset of cursor position, relative to the start page.
             * @param zoomFactor Zoom factor, acts as length multiplier.
             */
            TimeRangeInteraction.prototype.Zoom = function (pageXOffset, zoomFactor) {
                var xRatio = (pageXOffset - this.scalePagePxRange.Start) / (this.scalePagePxRange.End - this.scalePagePxRange.Start);
                var minLength = this.MinLength ? this.MinLength.asMilliseconds() : null;
                var maxLength = this.MaxLength ? this.MaxLength.asMilliseconds() : null;
                var minTime = this.MinTime ? this.MinTime.valueOf() : null;
                var maxTime = this.MaxTime ? this.MaxTime.valueOf() : null;
                this.timeRanges.forEach(function (range) {
                    var from = range.From.valueOf();
                    var to = range.To.valueOf();
                    var length = to - from;
                    var zoomRatio = zoomFactor < 0 ? 1 / -zoomFactor : zoomFactor;
                    var newLength = length * zoomRatio;
                    if (maxLength && newLength > maxLength) {
                        newLength = maxLength;
                    }
                    else if (minLength && newLength < minLength) {
                        newLength = minLength;
                    }
                    var diff = newLength - length;
                    var fromDiff = diff * xRatio;
                    var toDiff = diff - fromDiff;
                    var newFrom = from - fromDiff;
                    var newTo = to + toDiff;
                    if (minTime && newFrom < minTime) {
                        newTo = Math.min(newTo + (minTime - newFrom), maxTime);
                        newFrom = minTime;
                    }
                    if (maxTime && newTo > maxTime) {
                        newFrom = Math.max(newFrom - (newTo - maxTime), minTime);
                        newTo = maxTime;
                    }
                    range.From = moment(newFrom);
                    range.To = moment(newTo);
                });
                this.TimeRangesChanging(this.timeRanges);
                this.TimeRangesChanged(this.timeRanges);
            };
            return TimeRangeInteraction;
        }());
        View.TimeRangeInteraction = TimeRangeInteraction;
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
var Plantyst;
(function (Plantyst) {
    var View;
    (function (View) {
        var Utils;
        (function (Utils) {
            "use strict";
            /** Returns ratio between device pixel and logical pixel.
             * For example, on retina displays this function returns 2.
             */
            function GetDevicePixelRatio() {
                return window.devicePixelRatio || screen.deviceXDPI / screen.logicalXDPI;
            }
            Utils.GetDevicePixelRatio = GetDevicePixelRatio;
            /** Round time ranges in a way that all tick values are nice round numbers.
             */
            function RoundRange(range, ticks) {
                ticks--;
                var length = range.Max - range.Min;
                if (length <= 0) {
                    return;
                }
                var digits = Math.floor(Math.log(length) / Math.LN10);
                var modifier = Math.pow(10, -digits + 1);
                var modifiedLength = length * modifier;
                var roundedModifiedStep = Math.ceil(modifiedLength / ticks);
                var roundedModifiedLength = roundedModifiedStep * ticks;
                range.Min -= ((range.Min * modifier) % 1) / modifier;
                range.Max = ((range.Min * modifier) + roundedModifiedLength) / modifier;
            }
            Utils.RoundRange = RoundRange;
            /** Notify about progress and completion of given promises.
             * Progress notification is always delayed, which effectively aggregates notifications.
             * Result completes when all promises complete.
             * Boolean value informs about success or failure of promise. Promise progress is counted as success.
             */
            function GroupNotificationsDelayed(promises, notifyDelay) {
                if (notifyDelay === void 0) { notifyDelay = 0; }
                var groupResult = $.Deferred();
                var finishedCount = 0;
                var timer;
                if (promises.length === 0) {
                    groupResult.resolve();
                }
                var notifySuccess = false;
                var notify = function (success) {
                    notifySuccess = notifySuccess || success;
                    if (typeof (timer) === "number") {
                        return;
                    }
                    timer = setTimeout(function () {
                        timer = null;
                        if (finishedCount === promises.length) {
                            groupResult.resolve(notifySuccess);
                        }
                        else {
                            groupResult.notify(notifySuccess);
                        }
                        notifySuccess = false;
                    }, notifyDelay);
                };
                promises.forEach(function (promise) {
                    promise.done(function () {
                        finishedCount++;
                        notify(true);
                    });
                    promise.fail(function () {
                        finishedCount++;
                        notify(false);
                    });
                    promise.progress(function () {
                        notify(true);
                    });
                });
                return groupResult.promise();
            }
            Utils.GroupNotificationsDelayed = GroupNotificationsDelayed;
            /** Get two images overlap region.
             */
            function GetImageOverlap(from1, to1, sizePx1, from2, to2, sizePx2) {
                var from = Math.max(from1, from2);
                var to = Math.min(to1, to2);
                if (from >= to) {
                    return null;
                }
                var size1 = to1 - from1;
                var size2 = to2 - from2;
                var sizeRatio1 = sizePx1 / size1;
                var sizeRatio2 = sizePx2 / size2;
                var fromPx1 = (from - from1) * sizeRatio1;
                var toPx1 = (to - from1) * sizeRatio1;
                var fromPx2 = (from - from2) * sizeRatio2;
                var toPx2 = (to - from2) * sizeRatio2;
                return {
                    FromPx1: Math.max(0, fromPx1),
                    ToPx1: Math.min(sizePx1, toPx1),
                    FromPx2: Math.max(0, fromPx2),
                    ToPx2: Math.min(sizePx2, toPx2)
                };
            }
            Utils.GetImageOverlap = GetImageOverlap;
            /** Check if chart area is visible on screen.
             */
            function IsElementVisible(element) {
                return $(element).visible(true);
            }
            Utils.IsElementVisible = IsElementVisible;
        })(Utils = View.Utils || (View.Utils = {}));
    })(View = Plantyst.View || (Plantyst.View = {}));
})(Plantyst || (Plantyst = {}));
//# sourceMappingURL=Plantyst.js.map