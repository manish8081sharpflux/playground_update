import React from 'react';
import CourseStructureBuilder from '../admin/CourseStructureBuilder';

/**
 * CoachCourseDetailPage - Sprint 2 Story 05
 *
 * Thin wrapper around the reused <CourseStructureBuilder readOnly />.
 * The builder pulls :courseId from useParams, fetches via
 * GET /api/v2/lms/admin/courses/:id (scope-filtered server-side for
 * coaches), and handles 403 by toasting "Course not available" and
 * redirecting back to /coach/courses. All mutation UI is gated off
 * by the readOnly prop, and the auto-save hook is disabled.
 */
export default function CoachCourseDetailPage() {
  return <CourseStructureBuilder readOnly />;
}
