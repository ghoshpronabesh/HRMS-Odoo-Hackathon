import { NextRequest, NextResponse } from 'next/server';
import { getSessionToken, verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getSessionToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: targetEmployeeId } = await params;

    // Check permission: Must be HR or the target employee themselves
    if (payload.role !== 'hr' && payload.employee_id !== targetEmployeeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const docsRes = await query(
      'SELECT id, name, url, uploaded_at FROM employee_documents WHERE employee_id = $1 ORDER BY id DESC',
      [targetEmployeeId]
    );

    return NextResponse.json(docsRes.rows);
  } catch (error: any) {
    console.error('Get employee documents error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getSessionToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Only HR can add documents for any employee
    if (payload.role !== 'hr') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: targetEmployeeId } = await params;
    const body = await req.json();
    const { name, url } = body;

    if (!name || !url) {
      return NextResponse.json({ error: 'Document name and link URL are required' }, { status: 400 });
    }

    const insertRes = await query(
      'INSERT INTO employee_documents (employee_id, name, url) VALUES ($1, $2, $3) RETURNING id, name, url, uploaded_at',
      [targetEmployeeId, name, url]
    );

    return NextResponse.json({ success: true, document: insertRes.rows[0] });
  } catch (error: any) {
    console.error('Add employee document error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getSessionToken(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Only HR can delete documents
    if (payload.role !== 'hr') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: targetEmployeeId } = await params;
    const urlObj = new URL(req.url);
    const documentId = urlObj.searchParams.get('document_id');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    await query(
      'DELETE FROM employee_documents WHERE id = $1 AND employee_id = $2',
      [documentId, targetEmployeeId]
    );

    return NextResponse.json({ success: true, message: 'Document deleted successfully' });
  } catch (error: any) {
    console.error('Delete employee document error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
