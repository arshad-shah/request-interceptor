import React from 'react';
import { Tag, Link } from 'lucide-react';
import Input from '@/components/ui/Input';
import RouteTypeSelection from '../RouteTypeSelection';
import { RouteFormData } from '@/types';
import { type FieldChangeHandler, type RouteFormErrors } from '../route-form-logic';

interface BasicInfoSectionProps {
  formData: RouteFormData;
  errors: RouteFormErrors;
  onFieldChange: FieldChangeHandler;
}

const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  formData,
  errors,
  onFieldChange,
}) => {
  const isWebSocket = formData.routeType === 'websocket';

  return (
    <div className="space-y-4">
      <RouteTypeSelection
        formData={formData}
        handleInputChange={(field: string, value: string) =>
          onFieldChange(field as keyof RouteFormData, value)
        }
      />

      <Input
        label="Route Name (optional)"
        placeholder={
          isWebSocket
            ? 'e.g. Chat Messages, Live Updates'
            : 'e.g. Success Response, Error 404'
        }
        value={formData.name}
        onChange={(e) => onFieldChange('name', e.target.value)}
        leftIcon={<Tag />}
        helperText="Give your route a descriptive name to easily identify it"
      />

      <Input
        label={isWebSocket ? 'WebSocket URL to Intercept' : 'URL to Intercept'}
        placeholder={
          isWebSocket
            ? 'e.g. wss://api.example.com/chat or ws://localhost:8080/updates'
            : 'e.g. /api/users or https://example.com/api/data'
        }
        value={formData.url}
        onChange={(e) => onFieldChange('url', e.target.value)}
        leftIcon={<Link />}
        error={errors.url}
        helperText={
          isWebSocket
            ? 'Supports wildcards (*). Examples: wss://api.example.com/*, ws://localhost:*/chat'
            : 'Supports wildcards (*) and query parameters. Examples: /api/users, /api/users/*, https://api.example.com/data'
        }
      />
    </div>
  );
};

export default BasicInfoSection;
