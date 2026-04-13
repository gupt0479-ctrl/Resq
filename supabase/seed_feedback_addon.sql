-- â”€â”€â”€ Ember Table: feedback demo rows only â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Run in Supabase SQL Editor on the SAME project as the app when:
--   â€¢ migration 004_feedback_domain.sql is already applied, and
--   â€¢ organizations / customers / appointments are seeded, but
--   â€¢ select count(*) from feedback;  returns 0
--
-- Safe to re-run: uses ON CONFLICT DO NOTHING.
-- If inserts fail, check FKs: customer_id and appointment_id must exist in seed.

INSERT INTO feedback (
  id, organization_id, customer_id, appointment_id, source, guest_name_snapshot, score, comment,
  sentiment, topics, urgency, safety_flag, follow_up_status, flagged,
  reply_draft, internal_note, manager_summary, analysis_json, analysis_source,
  external_review_id, external_source, received_at
) VALUES
  ('00000000-0000-0000-000a-000000000001', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0004-000000000005',
   'internal', 'Priya Nair', 2,
   'We had a wonderful tasting menu but I had a reaction - I mentioned my tree nut allergy and still found pistachio in the dessert.',
   'negative', '["allergy_safety","food_quality"]'::jsonb, 5, TRUE, 'callback_needed', TRUE,
   NULL,
   'Tree nut incident after allergy disclosed - kitchen/service handoff breakdown.',
   'Priya Nair reported a tree nut allergy incident after dessert contained pistachio; urgency escalated for manager callback.',
   '{"churn_risk":"medium","recovery_action":{"type":"urgent_escalation","channel":"phone","priority":"urgent"}}'::jsonb,
   'rules_fallback', NULL, NULL, '2026-04-11 21:15:00+00'),

  ('00000000-0000-0000-000a-000000000002', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0003-000000000003', NULL,
   'google', 'Priya Nair', 1,
   'Two stars â€” slow seating and cold bread.',
   'negative', '["service_speed","food_quality"]'::jsonb, 4, FALSE, 'callback_needed', TRUE,
   'Thank you for taking the time to share this, Priya. I am sorry we missed the mark on pacing and bread service - that is not the Ember Table experience we strive for. I would welcome the chance to make this right personally; please reach out to our host stand.',
   'Repeat Google complaint after internal allergy case â€” coordinate responses.',
   'Google review from Priya flags service speed and food temperature; public reply drafted.',
   '{"churn_risk":"high","recovery_action":{"type":"personal_call","channel":"phone","priority":"high"}}'::jsonb,
   'rules_fallback', 'rev-google-priya-001', 'google', '2026-04-12 14:00:00+00'),

  ('00000000-0000-0000-000a-000000000003', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0004-000000000003',
   'internal', 'Jennifer Kim', 5,
   'Corporate dinner was flawless â€” thank the team for the wine pairings.',
   'positive', '["food_quality","ambiance"]'::jsonb, 1, FALSE, 'thankyou_sent', FALSE,
   NULL,
   'VIP corporate host â€” reinforce relationship.',
   'Jennifer Kim gave 5 stars after private dining; thank-you path selected.',
   '{"churn_risk":"low","recovery_action":{"type":"thank_you_email","channel":"email","priority":"low"}}'::jsonb,
   'rules_fallback', NULL, NULL, '2026-04-10 11:00:00+00'),

  ('00000000-0000-0000-000a-000000000004', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0003-000000000006', NULL,
   'yelp', 'David Chen', 3,
   'Food was good but we waited 40 minutes past our reservation time.',
   'neutral', '["wait_time","food_quality"]'::jsonb, 2, FALSE, 'none', FALSE,
   'David, thank you for your honest feedback â€” I am sorry for the long wait before your table was ready. We are tightening our pacing on busy nights and would love another chance to show you a smoother evening.',
   'At-risk guest - wait time topic.',
   'David Chen left 3 stars on Yelp citing wait time; neutral sentiment.',
   '{"churn_risk":"high","recovery_action":{"type":"comp_offer","channel":"email","priority":"normal"}}'::jsonb,
   'rules_fallback', 'rev-yelp-david-001', 'yelp', '2026-04-08 16:30:00+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO follow_up_actions (
  id, organization_id, feedback_id, action_type, status, channel, priority, message_draft
) VALUES
  ('00000000-0000-0000-000b-000000000001', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-000a-000000000001', 'urgent_escalation', 'pending', 'phone', 'urgent',
   'Priya, this is Sarah from Ember Table. I am deeply sorry about the dessert incident after you shared your allergy. I would like to speak with you today to understand what happened and how we can make this right.'),
  ('00000000-0000-0000-000b-000000000002', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-000a-000000000002', 'personal_call', 'pending', 'phone', 'high', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO ai_actions (
  id, organization_id, entity_type, entity_id, trigger_type, action_type, input_summary, output_payload_json, status, created_at
) VALUES
  ('00000000-0000-0000-000c-000000000001', '00000000-0000-0000-0000-000000000001',
   'feedback', '00000000-0000-0000-000a-000000000001', 'feedback.received', 'customer_service.analyze_review',
   'Priya Nair - score 2 - internal', '{"sentiment":"negative","urgency":5,"safety_flag":true}'::jsonb, 'executed', '2026-04-11 21:16:00+00'),
  ('00000000-0000-0000-000c-000000000002', '00000000-0000-0000-0000-000000000001',
   'feedback', '00000000-0000-0000-000a-000000000002', 'feedback.received', 'customer_service.analyze_review',
   'Priya Nair - score 1 - google', '{"sentiment":"negative","urgency":4}'::jsonb, 'executed', '2026-04-12 14:01:00+00'),
  ('00000000-0000-0000-000c-000000000003', '00000000-0000-0000-0000-000000000001',
   'feedback', '00000000-0000-0000-000a-000000000003', 'feedback.received', 'customer_service.analyze_review',
   'Jennifer Kim - score 5 - internal', '{"sentiment":"positive","urgency":1}'::jsonb, 'executed', '2026-04-10 11:02:00+00')
ON CONFLICT (id) DO NOTHING;
