import React, { useState, useEffect, useMemo } from 'react';
import { Settings2, Code, FileText, Globe } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { chromeApi } from '@/lib/chrome-api';
import { RouteFormData } from '@/types';
import { defaultFormData } from '@/constants/route-form';
import {
  buildRouteFromForm,
  routeSavedMessage,
  routeToFormData,
  validateRouteForm,
  type FieldChangeHandler,
  type RouteFormErrors,
} from './route-form-logic';
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
    closeForm,
    setEditingRoute,
    addNotification,
    addRoute,
    updateRoute,
    removeRoute,
  } = useAppStore();

  const [formData, setFormData] = useState<RouteFormData>(defaultFormData);
  const [errors, setErrors] = useState<RouteFormErrors>({});
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
      setFormData(routeToFormData(editingRoute, routes[editingRoute]));
    } else {
      setFormData(defaultFormData);
    }
  }, [editingRoute, routes]);

  const handleSubmit = async () => {
    const newErrors = validateRouteForm(formData);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
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
      const { routeKey, routeConfig } = buildRouteFromForm(formData);
      const keyChanged = isEditing && editingRoute !== routeKey;

      if (isEditing && keyChanged) {
        await chromeApi.removeRoute(editingRoute!);
        await chromeApi.addRoute(routeKey, routeConfig, formData.name);
        removeRoute(editingRoute!);
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

      addNotification({
        title: 'Success',
        message: routeSavedMessage(formData, isEditing),
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
    closeForm();
  };

  const handleFieldChange: FieldChangeHandler = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Mode badge for the header
  const modeBadge = isWebSocket ? (
    <span className="ds-badge violet">WebSocket</span>
  ) : isInjection ? (
    <span className="ds-badge indigo">
      Injection
    </span>
  ) : formData.interceptionMode === 'block' ? (
    <span className="ds-badge rose">
      Block
    </span>
  ) : formData.interceptionMode === 'redirect' ? (
    <span className="ds-badge amber">
      Redirect
    </span>
  ) : formData.interceptionMode === 'passthrough' ? (
    <span className="ds-badge info">Passthrough</span>
  ) : (
    <span className="ds-badge success">Mock Response</span>
  );

  return (
    <div className="space-y-4">
      {/* Mode badge row */}
      <div className="flex items-center gap-2">
        <Settings2 size={14} className="text-[var(--accent-indigo)]" />
        <span className="text-[12px] font-medium text-[var(--text-secondary)]">Mode:</span>
        {modeBadge}
      </div>

      {/* Form sections */}
      <div className="space-y-4">
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
      <div className="pt-2">
        <FormFooter
          isEditing={isEditing}
          isSubmitting={isSubmitting}
          onCancel={handleCancel}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
};

export default AddRouteForm;
