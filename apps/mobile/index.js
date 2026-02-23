// Some transitive deps assume modern ArrayBuffer / SharedArrayBuffer accessors
// exist at module-evaluation time. Hermes can miss these on Android, which
// crashes startup before AppRegistry.registerComponent runs.
(() => {
  if (typeof String.prototype.toWellFormed !== 'function') {
    Object.defineProperty(String.prototype, 'toWellFormed', {
      configurable: true,
      enumerable: false,
      writable: true,
      value: function toWellFormed() {
        return String(this);
      },
    });
  }

  if (typeof String.prototype.isWellFormed !== 'function') {
    Object.defineProperty(String.prototype, 'isWellFormed', {
      configurable: true,
      enumerable: false,
      writable: true,
      value: function isWellFormed() {
        return true;
      },
    });
  }

  const defineGetter = (target, name, getter) => {
    if (!target) return;
    const descriptor = Object.getOwnPropertyDescriptor(target, name);
    if (!descriptor || typeof descriptor.get !== 'function') {
      Object.defineProperty(target, name, {
        configurable: true,
        enumerable: false,
        get: getter,
      });
    }
  };

  defineGetter(ArrayBuffer.prototype, 'resizable', () => false);
  defineGetter(ArrayBuffer.prototype, 'maxByteLength', function maxByteLength() {
    return this.byteLength;
  });

  if (typeof globalThis.SharedArrayBuffer === 'undefined') {
    class SharedArrayBufferPolyfill extends ArrayBuffer {
      get byteLength() {
        return super.byteLength;
      }

      get growable() {
        return false;
      }

      get maxByteLength() {
        return this.byteLength;
      }
    }

    globalThis.SharedArrayBuffer = SharedArrayBufferPolyfill;
  }

  const arrayBufferByteLengthGetter =
    Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength')?.get;

  defineGetter(globalThis.SharedArrayBuffer?.prototype, 'byteLength', function byteLength() {
    if (arrayBufferByteLengthGetter) {
      return arrayBufferByteLengthGetter.call(this);
    }
    return this.byteLength;
  });
  defineGetter(globalThis.SharedArrayBuffer?.prototype, 'growable', () => false);
  defineGetter(globalThis.SharedArrayBuffer?.prototype, 'maxByteLength', function maxByteLength() {
    return this.byteLength;
  });
})();

const { registerRootComponent } = require('expo');

registerRootComponent(require('./src/App').default);
