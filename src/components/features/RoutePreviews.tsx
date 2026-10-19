import React from 'react';
import { X, Import } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import RoutePreview from './RoutePreview';
import type { PreviewRoute } from './template-import';

interface RoutePreviewsProps {
    parsedRoutes: PreviewRoute[];
    setShowPreview: (show: boolean) => void;
    setParsedRoutes: (routes: PreviewRoute[]) => void;
    handleImportRoutes: () => void;
    isImporting: boolean;
}

const RoutePreviews: React.FC<RoutePreviewsProps> = ({
    parsedRoutes,
    setShowPreview,
    setParsedRoutes,
    handleImportRoutes,
    isImporting
}) => {
    const httpCount = parsedRoutes.filter(r => r.routeType === 'http' || (!r.routeType && r.method)).length;
    const wsCount = parsedRoutes.filter(r => r.routeType === 'websocket').length;
    const injCount = parsedRoutes.filter(r => r.routeType === 'injection').length;

    return (
        <Card>
            <Card.Header>
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4 min-w-0">

                        <div className="flex items-center gap-1.5 flex-wrap text-(--text-tertiary)">
                            {httpCount > 0 && (
                                <span className="px-2 py-1 bg-[rgba(16,185,129,0.15)] text-[var(--accent-emerald)] rounded-[var(--radius-sm)] text-xs font-medium">
                                    {httpCount} HTTP
                                </span>
                            )}
                            {wsCount > 0 && (
                                <span className="px-2 py-1 bg-[rgba(139,92,246,0.15)] text-[var(--accent-violet)] rounded-[var(--radius-sm)] text-xs font-medium">
                                    {wsCount} WebSocket
                                </span>
                            )}
                            {injCount > 0 && (
                                <span className="px-2 py-1 bg-[rgba(99,102,241,0.15)] text-(--accent-indigo) rounded-sm text-xs font-medium">
                                    {injCount} Injection
                                </span>
                            )}
                        </div>
                    </div>

                    <Button
                        variant="icon"
                        size="sm"
                        onClick={() => {
                            setShowPreview(false);
                            setParsedRoutes([]);
                        }}
                        title="Cancel import"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </Card.Header>

            <Card.Body className="p-0">
                <RoutePreview routes={parsedRoutes} />
            </Card.Body>

            <Card.Footer className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-tertiary)]">
                    Ready to import
                </span>

                <Button
                    onClick={handleImportRoutes}
                    isLoading={isImporting}
                    leftIcon={<Import className="w-4 h-4" />}
                >
                    Import {parsedRoutes.length} {parsedRoutes.length === 1 ? 'Route' : 'Routes'}
                </Button>
            </Card.Footer>
        </Card>
    );
};

export default RoutePreviews;
