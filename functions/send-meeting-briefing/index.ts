import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@blinkdotnew/sdk";

const blink = createClient({
  projectId: "leadership-meeting-reflection-app-2c3hahsk",
  authRequired: false
});

interface MeetingBriefingRequest {
  meetingId: string;
  userId: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { meetingId, userId }: MeetingBriefingRequest = await req.json();

    // Get meeting details
    const meetings = await blink.db.meetings.list({
      where: { id: meetingId, userId }
    });

    if (meetings.length === 0) {
      return new Response(JSON.stringify({ error: 'Meeting not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const meeting = meetings[0];

    // Get reflection answers
    const answers = await blink.db.reflectionAnswers.list({
      where: { meetingId }
    });

    // Get user details
    blink.auth.setToken(req.headers.get('authorization')?.replace('Bearer ', '') || '');
    const user = await blink.auth.me();

    // Generate briefing content
    let briefingContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #000066; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Meeting Reflection Briefing</h1>
        </div>
        
        <div style="padding: 20px;">
          <h2 style="color: #000066; margin-bottom: 10px;">${meeting.title}</h2>
          <p style="color: #666; margin-bottom: 20px;">
            <strong>Time:</strong> ${new Date(meeting.startTime).toLocaleString()}<br>
            <strong>Location:</strong> ${meeting.location || 'Not specified'}
          </p>
          
          <h3 style="color: #000066; margin-bottom: 15px;">Your Reflection Summary</h3>
    `;

    if (answers.length > 0) {
      briefingContent += '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">';
      
      for (const answer of answers) {
        // Get the question details
        const questions = await blink.db.reflectionQuestions.list({
          where: { id: answer.questionId }
        });
        
        if (questions.length > 0) {
          const question = questions[0];
          briefingContent += `
            <div style="margin-bottom: 15px;">
              <p style="font-weight: bold; color: #000066; margin-bottom: 5px;">${question.question}</p>
              <p style="color: #333; margin: 0;">${answer.answer}</p>
            </div>
          `;
        }
      }
      
      briefingContent += '</div>';
    } else {
      briefingContent += '<p style="color: #666; font-style: italic;">No reflection answers found for this meeting.</p>';
    }

    briefingContent += `
          <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <p style="color: #0066cc; margin: 0; text-align: center;">
              <strong>Good luck with your meeting! 🚀</strong>
            </p>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p style="margin: 0;">Leadership Meeting Reflection App</p>
        </div>
      </div>
    `;

    // Send email using Blink notifications
    const emailResult = await blink.notifications.email({
      to: user.email,
      subject: `Meeting Reflection Briefing - ${meeting.title}`,
      html: briefingContent,
      text: `Meeting Reflection Briefing for ${meeting.title}\n\nYour meeting starts soon. Please review your reflection answers to prepare.`
    });

    if (emailResult.success) {
      // Mark reminder as sent
      await blink.db.meetings.update(meetingId, {
        reminderSent: true
      });

      return new Response(JSON.stringify({ 
        success: true, 
        messageId: emailResult.messageId 
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } else {
      return new Response(JSON.stringify({ 
        error: 'Failed to send email' 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

  } catch (error) {
    console.error('Error sending meeting briefing:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});