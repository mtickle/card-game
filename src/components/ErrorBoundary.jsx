// components/ErrorBoundary.jsx
import React from 'react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Caught by Error Boundary:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            const quotes = [
                "“Mistakes are the portals of discovery.” — James Joyce",
                "“Every flower must grow through dirt.” — Laurie Jean Sennott",
                "“Even the darkest night will end and the sun will rise.” — Victor Hugo",
                "“There are always flowers for those who want to see them.” — Henri Matisse",
                "“Failure is simply the opportunity to begin again, this time more intelligently.” — Henry Ford",
            ];
            const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

            return (
                <div
                    className="min-h-screen flex flex-col items-center justify-center text-center p-8"
                    style={{
                        background: "linear-gradient(to bottom, #d0f0c0 0%, #ffffff 100%)",
                        fontFamily: "'Segoe UI', sans-serif",
                    }}
                >
                    <div className="bg-green-50 text-green-900 border border-green-200 rounded p-6 text-sm text-left overflow-x-auto whitespace-pre-wrap max-h-300 mt-6">
                        <div className="text-6xl mb-4">🐝🌸</div>
                        <h1 className="text-2xl font-semibold text-green-800 mb-2">
                            Something fluttered out of place...
                        </h1>
                        <p className="text-green-700 mb-4">But growth comes with a few stumbles.</p>
                        <blockquote className="italic text-sm text-green-600 mb-4">
                            {randomQuote}
                        </blockquote>

                        <div className="bg-green-50 text-green-900 border border-green-200 rounded p-4 text-xs text-left overflow-x-auto whitespace-pre-wrap max-h-60">
                            <strong>Error:</strong> {this.state.error?.toString()}
                            <br /><br />
                            <strong>Component Stack:</strong>
                            <pre className="mt-2">{this.state.errorInfo?.componentStack}</pre>
                        </div>
                    </div>

                    <div className="mt-8 opacity-50 text-sm">
                        <p>🌼 The meadow will bloom again 🌼</p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
