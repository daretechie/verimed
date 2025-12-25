import { Injectable, Logger } from '@nestjs/common';
import CircuitBreaker from 'opossum';

@Injectable()
export class ResilienceService {
  private readonly logger = new Logger(ResilienceService.name);
  private breakers = new Map<string, CircuitBreaker>();

  private readonly defaultOptions: CircuitBreaker.Options = {
    timeout: 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 10000,
  };

  /**
   * Executes a function via a managed Circuit Breaker.
   * @param key Unique identifier for the breaker (e.g., 'US_NPI_API')
   * @param action The function to execute. MUST be passed here to `fire`.
   * @param args Arguments to pass to the function.
   */
  async execute<T>(
    key: string,
    action: (...args: any[]) => Promise<T>,
    ...args: any[]
  ): Promise<T> {
    let breaker = this.breakers.get(key);

    if (!breaker) {
      this.logger.log(`Creating new Circuit Breaker for: ${key}`);
      // Initialize with the action. Opossum uses this action when fire() is called.
      // Note: Opossum expects fire(...args) to pass args to this action.
      breaker = new CircuitBreaker(action, this.defaultOptions);
      this.setupLogging(breaker, key);
      this.breakers.set(key, breaker);
    }

    // In scenarios where 'action' might be a different closure (not ideal for Opossum caching),
    // we should ideally pass a consistent function reference (like this.httpService.get).
    // If we pass a closure `() => get(url)`, key MUST be unique or we risk executing stale closures?
    // NO: breaker.fire(args) uses the function passed to constructor.

    // ISSUE: If the adapter passes `() => axios.get(dynamicUrl)` as 'action',
    // and we reuse the breaker, the breaker uses the *first* closure passed!
    // SUBSEQUENT calls to fire() will run the *OLD* closure if we rely on the constructor's action.

    // FIX: We must not bind the specific request logic to the breaker's operation function.
    // Instead, the breaker should wrap a GENERIC executor, and we pass the specific promise-creator as an arg.

    // CORRECT PATTERN for dynamic closures with Opossum:
    // Create a breaker that takes a function `fn` and executes it.
    // `breaker.fire(mySpecificPromiseFunction)`

    if (!breaker) {
      // Should not happen as we set it above, but for TS checks:
      return action(...args);
    }

    // However, since we might have created the breaker with a DIFFERENT function reference in the past (the first request),
    // and Opossum calls THAT function... this is tricky with Closures.

    // ULTIMATE SIMPLIFICATION:
    // We use a breaker that wraps a simple "Invoker".
    // const breaker = new CircuitBreaker((fn) => fn(), options);
    // breaker.fire(() => axios.get(...));

    // Let's implement this generic invoker pattern.
    return this.getGenericBreaker(key).fire(action) as Promise<T>;
  }

  private getGenericBreaker(key: string): CircuitBreaker {
    if (!this.breakers.has(key)) {
      // This breaker expects to be fired with a function that returns a promise
      const breaker = new CircuitBreaker(
        (fn: () => Promise<any>) => fn(),
        this.defaultOptions,
      );
      this.setupLogging(breaker, key);
      this.breakers.set(key, breaker);
    }
    return this.breakers.get(key)!;
  }

  private setupLogging(breaker: CircuitBreaker, key: string) {
    breaker.on('open', () =>
      this.logger.warn(`⚠️ Circuit Breaker OPEN: ${key}`),
    );
    breaker.on('halfOpen', () =>
      this.logger.log(`⏳ Circuit Breaker HALF-OPEN: ${key}`),
    );
    breaker.on('close', () =>
      this.logger.log(`✅ Circuit Breaker CLOSED: ${key}`),
    );
  }
}
