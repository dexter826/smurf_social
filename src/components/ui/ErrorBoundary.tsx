import React from 'react';

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render(): React.ReactNode {
        const { hasError, error } = this.state;
        const { fallback, children } = this.props;

        if (hasError) {
            if (fallback) {
                return fallback;
            }

            const isEnvError = error?.message.includes('environment');

            return (
                <div className="flex items-center justify-center min-h-screen bg-gray-50">
                    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-error-light rounded-full">
                            <svg
                                className="w-6 h-6 text-red-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>
                        <h3 className="mt-4 text-lg font-medium text-gray-900 text-center">
                            {isEnvError ? 'Lỗi Cấu Hình' : 'Có lỗi xảy ra'}
                        </h3>
                        <p className="mt-2 text-sm text-gray-500 text-center">
                            {isEnvError
                                ? 'Ứng dụng chưa được cấu hình đúng. Vui lòng kiểm tra file .env'
                                : 'Đã xảy ra lỗi không mong muốn. Vui lòng tải lại trang.'}
                        </p>
                        {isEnvError && (
                            <div className="mt-4 bg-gray-50 rounded-md p-4">
                                <p className="text-sm text-gray-700 font-medium mb-2">
                                    Các bước khắc phục:
                                </p>
                                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                                    <li>Tạo file .env từ .env.example</li>
                                    <li>Điền đầy đủ thông tin Firebase</li>
                                    <li>Khởi động lại ứng dụng</li>
                                </ol>
                            </div>
                        )}
                        {error && (
                            <details className="mt-4 text-xs text-gray-400">
                                <summary className="cursor-pointer">Chi tiết lỗi</summary>
                                <pre className="mt-2 whitespace-pre-wrap break-words">
                                    {error.toString()}
                                </pre>
                            </details>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-6 w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-hover transition-colors"
                        >
                            Tải lại trang
                        </button>
                    </div>
                </div>
            );
        }

        return children;
    }
}
