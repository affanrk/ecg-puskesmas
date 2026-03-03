export {};

declare global {
    interface Window {
        __ENV__?: Record<string, string>;
        __is_logging_out?: boolean;
    }
}
