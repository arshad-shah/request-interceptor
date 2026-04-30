import React, { useState, useEffect, useMemo } from 'react';
import { Settings2, Code, FileText, Globe } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import {
  chromeApi,
  parseRouteKey,
  createRouteKey,
  createInjectionKey,
  validateJson,
  formatJson,
} from '@/lib/chrome-api';
import { parseWebSocketKey, parseInjectionKey } from '@/lib/utils';
import { HttpMethod, RouteFormData, InterceptionMode } from '@/types';
import { defaultFormData } from '@/constants/route-form';
import FormSection from './sections/FormSection';
import BasicInfoSection from './sections/BasicInfoSection';
import InterceptionModeSection from './sections/InterceptionModeSection';
import RequestConfigSection from './sections/RequestConfigSection';
import HeadersSection from './sections/HeadersSection';
import BodySection from './sections/BodySection';
import WebSocketSection from './sections/WebSocketSection';
import InjectionSection from './sections/InjectionSection';
import FormFooter from './sections/FormFooter';

const AddRouteForm: React.FC = () => {
  const {
    routes,
    editingRoute,
    setActiveTab,
    setEditingRoute,
    addNotification,
    addRoute,
    updateRoute,
  } = useAppStore();

  const [formData, setFormData] = useState<RouteFormData>(defaultFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof RouteFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = editingRoute != null;
  const isWebSocket = formData.routeType === 'websocket';
  const isInjection = formData.routeType === 'injection';
  const isHttp = !isWebSocket && !isInjection;

  // Compute badge counts for collapsible sections
  const headersBadgeCount = useMemo(() => {
    if (!isHttp) return 0;
    return (
      Object.keys(formData.responseHeaders).length +
      Object.keys(formData.requestHeaders).length +
      formData.removeRequestHeaders.length +
      formData.queryParamRules.length
    );
  }, [isHttp, formData.responseHeaders, formData.requestHeaders, formData.removeRequestHeaders, formData.queryParamRules]);

  const bodyHasData = useMemo(() => {
    if (!isHttp) return false;
    return formData.response.trim().length > 0 || formData.requestBody.trim().length > 0;
  }, [isHttp, formData.response, formData.requestBody]);

  // Load route data when editing
  useEffect(() => {
    if (editingRoute && routes[editingRoute]) {
      const routeConfig = routes[editingRoute];

      if (editingRoute.startsWith('WS:')) {
        const { url, name } = parseWebSocketKey(editingRoute);
        setFormData({
          ...defaultFormData,
          routeType: 'websocket',
          name: name || '',
          url,
          delay: (routeConfig as any).delay || 0,
          incomingRules: (routeConfig as any).incomingRules || [],
          outgoingRules: (routeConfig as any).outgoingRules || [],
        });
      } else if (editingRoute.startsWith('INJ:')) {
        const { urlPattern, name } = parseInjectionKey(editingRoute);
        setFormData({
          ...defaultFormData,
          routeType: 'injection',
          name: name || '',
          url: urlPattern,
          scripts: (routeConfig as any).scripts || [],
          stylesheets: (routeConfig as any).stylesheets || [],
          injectAt: (routeConfig as any).injectAt || 'document_end',
        });
      } else {
        const { method, url, name } = parseRouteKey(editingRoute);
        const rc = routeConfig as any;
        const mode: InterceptionMode =
          rc.interceptionMode || (rc.headersOnly ? 'passthrough' : 'mock');
        setFormData({
          ...defaultFormData,
          routeType: 'http',
          name: name || '',
          url,
          method: method as HttpMethod,
          status: rc.status,
          delay: rc.delay ?? 0,
          contentType: rc.contentType,
          response:
            typeof rc.response === 'object'
              ? formatJson(rc.response)
              : String(rc.response ?? ''),
          responseHeaders: rc.responseHeaders || {},
          requestHeaders: rc.requestHeaders || {},
          removeRequestHeaders: rc.removeRequestHeaders || [],
          headersOnly: rc.headersOnly || false,
          interceptionMode: mode,
          redirectUrl: rc.redirectUrl || '',
          requestBody: rc.requestBody || '',
          queryParamRules: rc.queryParamRules || [],
          graphqlOperationName: rc.graphqlOperationName || '',
        });
      }
    } else {
      setFormData(defaultFormData);
    }
  }, [editingRoute, routes]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof RouteFormData, string>> = {};

    if (!formData.url.trim()) {
      newErrors.url = 'URL is required';
    }

    if (formData.delay < 0) {
      newErrors.delay = 'Delay must be 0 or greater';
    }

    if (formData.routeType === 'http') {
      if (formData.status < 100 || formData.status > 599) {
        newErrors.status = 'Status code must be between 100 and 599';
      }

      switch (formData.interceptionMode) {
        case 'mock':
          if (!formData.response.trim()) {
            newErrors.response = 'Response is required for mock mode';
          } else if (formData.contentType === 'application/json') {
            const jsonValidation = validateJson(formData.response);
            if (!jsonValidation.isValid) {
              newErrors.response = jsonValidation.error;
            }
          }
          break;
        case 'passthrough': {
          const hasResponseHeaders = Object.keys(formData.responseHeaders).length > 0;
          const hasRequestHeaders = Object.keys(formData.requestHeaders).length > 0;
          const hasRemoveHeaders = formData.removeRequestHeaders.length > 0;
          const hasRequestBody = formData.requestBody.trim().length > 0;
          const hasQueryParams = formData.queryParamRules.length > 0;

          if (
            !hasResponseHeaders &&
            !hasRequestHeaders &&
            !hasRemoveHeaders &&
            !hasRequestBody &&
            !hasQueryParams
          ) {
            newErrors.responseHeaders =
              'At least one modification is required for passthrough mode';
          }
          break;
        }
        case 'block':
          break;
        case 'redirect':
          if (!formData.redirectUrl.trim()) {
            newErrors.redirectUrl = 'Redirect URL is required';
          }
          break;
      }
    } else if (formData.routeType === 'websocket') {
      const hasIncomingRules = formData.incomingRules.some(
        (rule) => rule.enabled && rule.match.trim()
      );
      const hasOutgoingRules = formData.outgoingRules.some(
        (rule) => rule.enabled && rule.match.trim()
      );

      if (!hasIncomingRules && !hasOutgoingRules) {
        newErrors.incomingRules =
          'At least one message rule is required for WebSocket interception';
      }
    } else if (formData.routeType === 'injection') {
      const hasScripts = formData.scripts.some((s) => s.trim());
      const hasStylesheets = formData.stylesheets.some((s) => s.trim());

      if (!hasScripts && !hasStylesheets) {
        (newErrors as any).scripts = 'At least one script or stylesheet is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      addNotification({
        title: 'Validation Error',
        message: 'Please fix the form errors before submitting',
        type: 'error',
        timestamp: Date.now(),
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let routeKey: string;
      let routeConfig: any;

      if (formData.routeType === 'websocket') {
        routeKey = formData.name
          ? `WS:${formData.url}|${formData.name}`
          : `WS:${formData.url}`;
        routeConfig = {
          enabled: true,
          timestamp: Date.now(),
          name: formData.name,
          incomingRules: formData.incomingRules,
          outgoingRules: formData.outgoingRules,
          delay: formData.delay,
        };
      } else if (formData.routeType === 'injection') {
        routeKey = createInjectionKey(formData.url, formData.name);
        routeConfig = {
          enabled: true,
          timestamp: Date.now(),
          name: formData.name,
          scripts: formData.scripts.filter((s) => s.trim()),
          stylesheets: formData.stylesheets.filter((s) => s.trim()),
          injectAt: formData.injectAt,
          urlPattern: formData.url,
        };
      } else {
        routeKey = createRouteKey(formData.method, formData.url, formData.name);

        let responseBody: any;
        if (formData.interceptionMode === 'mock') {
          if (formData.contentType === 'application/json') {
            const jsonValidation = validateJson(formData.response);
            responseBody = jsonValidation.parsed;
          } else {
            responseBody = formData.response;
          }
        } else {
          responseBody = formData.response.trim() || null;
        }

        routeConfig = {
          status: formData.status,
          delay: formData.delay,
          response: responseBody,
          contentType: formData.contentType,
          enabled: true,
          timestamp: Date.now(),
          name: formData.name,
          responseHeaders: formData.responseHeaders,
          requestHeaders: formData.requestHeaders,
          removeRequestHeaders: formData.removeRequestHeaders,
          headersOnly: formData.interceptionMode === 'passthrough',
          interceptionMode: formData.interceptionMode,
          redirectUrl: formData.redirectUrl,
          requestBody: formData.requestBody,
          queryParamRules: formData.queryParamRules,
          graphqlOperationName: formData.graphqlOperationName,
        };
      }

      const keyChanged = isEditing && editingRoute !== routeKey;

      if (isEditing && keyChanged) {
        await chromeApi.removeRoute(editingRoute!);
        await chromeApi.addRoute(routeKey, routeConfig, formData.name);
        updateRoute(routeKey, routeConfig);
      } else {
        const targetKey = isEditing ? editingRoute! : routeKey;
        await chromeApi.addRoute(targetKey, routeConfig, formData.name);

        if (isEditing) {
          updateRoute(targetKey, routeConfig);
        } else {
          addRoute(targetKey, routeConfig);
        }
      }

      const typeText =
        formData.routeType === 'websocket'
          ? ' WebSocket'
          : formData.routeType === 'injection'
          ? ' Injection'
          : '';
      const modeText =
        formData.routeType === 'http' ? ` (${formData.interceptionMode})` : '';

      addNotification({
        title: 'Success',
        message:
          (isEditing ? 'Route updated successfully' : 'Route added successfully') +
          typeText +
          modeText,
        type: 'success',
        timestamp: Date.now(),
      });

      handleCancel();
    } catch (error) {
      console.error('Error saving route:', error);
      addNotification({
        title: 'Error',
        message: 'Failed to save route',
        type: 'error',
        timestamp: Date.now(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData(defaultFormData);
    setErrors({});
    setEditingRoute(null);
    setActiveTab('routes');
  };

  const handleFieldChange = (field: keyof RouteFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Mode badge for the header
  const modeBadge = isWebSocket ? (
    <span className="ds-badge violet">WebSocket</span>
  ) : isInjection ? (
    <span className="ds-badge" style={{ color: 'var(--accent-indigo)', background: 'rgba(99,102,241,0.15)' }}>
      Injection
    </span>
  ) : formData.interceptionMode === 'block' ? (
    <span className="ds-badge" style={{ color: 'var(--accent-rose)', background: 'rgba(244,63,94,0.15)' }}>
      Block
    </span>
  ) : formData.interceptionMode === 'redirect' ? (
    <span className="ds-badge" style={{ color: 'var(--accent-amber)', background: 'rgba(245,158,11,0.15)' }}>
      Redirect
    </span>
  ) : formData.interceptionMode === 'passthrough' ? (
    <span className="ds-badge info">Passthrough</span>
  ) : (
    <span className="ds-badge success">Mock Response</span>
  );

  return (
    <div className="ds-panel max-w-4xl mx-auto">
      {/* Panel Header */}
      <div className="ds-panel-header">
        <div className="flex items-center gap-2">
          <Settings2 size={18} className="text-[var(--accent-indigo)]" />
          <span className="text-[14px] font-semibold text-[var(--text-primary)]">
            {isEditing ? 'Edit Route' : 'Add New Route'}
          </span>
          {modeBadge}
        </div>
      </div>

      {/* Panel Body */}
      <div className="ds-panel-body space-y-4">
        {/* Basic Info — always visible */}
        <BasicInfoSection
          formData={formData}
          errors={errors}
          onFieldChange={handleFieldChange}
        />

        {/* HTTP-specific sections */}
        {isHttp && (
          <>
            {/* Interception Mode — always visible */}
            <InterceptionModeSection
              formData={formData}
              errors={errors}
              onFieldChange={handleFieldChange}
            />

            {/* Request Config — collapsible, default open */}
            <FormSection
              title="Request Configuration"
              icon={<Globe size={14} />}
              defaultCollapsed={false}
              forceExpanded={isEditing}
            >
              <RequestConfigSection
                formData={formData}
                errors={errors}
                onFieldChange={handleFieldChange}
              />
            </FormSection>

            {/* Headers — collapsible, auto-expand when has data */}
            {formData.interceptionMode !== 'block' && (
              <FormSection
                title="Headers & Query Params"
                icon={<Settings2 size={14} />}
                badgeCount={headersBadgeCount}
                forceExpanded={isEditing && headersBadgeCount > 0}
                autoFocus
              >
                <HeadersSection
                  formData={formData}
                  onFieldChange={handleFieldChange}
                />
              </FormSection>
            )}

            {/* Body — collapsible, auto-expand when has data */}
            {formData.interceptionMode !== 'block' && (
              <FormSection
                title="Response & Request Body"
                icon={<FileText size={14} />}
                defaultCollapsed={formData.interceptionMode !== 'mock'}
                forceExpanded={
                  formData.interceptionMode === 'mock' ||
                  (isEditing && bodyHasData)
                }
              >
                <BodySection
                  formData={formData}
                  errors={errors}
                  onFieldChange={handleFieldChange}
                />
              </FormSection>
            )}
          </>
        )}

        {/* Injection-specific section */}
        {isInjection && (
          <FormSection
            title="Injection Scripts & Styles"
            icon={<Code size={14} />}
            collapsible={false}
          >
            <InjectionSection
              formData={formData}
              errors={errors}
              onFieldChange={handleFieldChange}
            />
          </FormSection>
        )}

        {/* WebSocket-specific section */}
        {isWebSocket && (
          <WebSocketSection
            formData={formData}
            errors={errors}
            onFieldChange={handleFieldChange}
          />
        )}
      </div>

      {/* Footer */}
      <FormFooter
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default AddRouteForm;
