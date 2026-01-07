/**
 * Decorator to wrap a method with start/end transformation status
 * @param message - The message to show in the status bar
 */
export function Transformation(message: string) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (this: any, ...args: any[]) {
      if (this.startTransformation) {
        await this.startTransformation(message);
      }
      try {
        return await originalMethod.apply(this, args);
      } finally {
        if (this.endTransformation) {
          this.endTransformation();
        }
      }
    };
    return descriptor;
  };
}
