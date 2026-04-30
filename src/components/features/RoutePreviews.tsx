import React from 'react';
import { X, Import } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import RoutePreview from './RoutePreview';

interface RoutePreviewsProps {
    parsedRoutes: any[];
    setShowPreview: (show: boolean) => void;
    setParsedRoutes: (routes: any[]) => void;
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
    const httpCount = parsedRoutes.filter(r => r.routeType !== 'websocket').length;
    const wsCount = parsedRoutes.filter(r => r.routeType === 'websocket').length;

    return (
        <Card className="border-[var(--accent-cyan)]">
            <Card.Header>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">

                        {/* Simple route type counts */}
                        <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
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
