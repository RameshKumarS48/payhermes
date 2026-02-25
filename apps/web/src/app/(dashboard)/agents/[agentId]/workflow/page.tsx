'use client';

import { WorkflowCanvas } from '@/components/workflow/workflow-canvas';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Play, Upload } from 'lucide-react';
import Link from 'next/link';

export default function WorkflowBuilderPage() {
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/agents"
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900 tracking-tight">
                Appointment Booking Bot
              </h1>
              <Badge variant="warning">Draft</Badge>
            </div>
            <p className="text-xs text-gray-500">Main Workflow &middot; v1</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Play className="w-3.5 h-3.5 mr-1.5" />
            Test
          </Button>
          <Button variant="secondary" size="sm">
            <Save className="w-3.5 h-3.5 mr-1.5" />
            Save
          </Button>
          <Button size="sm">
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Publish
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <WorkflowCanvas />
    </div>
  );
}
