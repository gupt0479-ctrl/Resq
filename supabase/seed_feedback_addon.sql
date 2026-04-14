-- Ember Table: feedback demo rows only
-- Run in Supabase SQL Editor on the SAME project as the app when:
--   * migration 004_feedback_domain.sql is already applied, and
--   * organizations / customers / appointments are seeded, but
--   * you want to restore the canonical feedback demo state.
--
-- Safe to re-run: this file UPSERTs the seeded feedback, follow-up actions,
-- and ai_actions rows back to their baseline values.

INSERT INTO feedback (
  id, organization_id, customer_id, appointment_id, source, guest_name_snapshot, score, comment,
  sentiment, topics, urgency, safety_flag, follow_up_status, flagged,
  reply_draft, internal_note, manager_summary, analysis_json, analysis_source,
  external_review_id, external_source, received_at
) VALUES
  (
    '00000000-0000-0000-000a-000000000001', '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0004-000000000005',
    'internal', 'Priya Nair', 2,
    'We had a wonderful tasting menu but I had a reaction - I mentioned my tree nut allergy and still found pistachio in the dessert.',
    'negative', '["allergy_safety","food_quality"]'::jsonb, 5, TRUE, 'callback_needed', TRUE,
    NULL,
    'Tree nut incident after allergy disclosed - kitchen/service handoff breakdown.',
    'Priya Nair reported a tree nut allergy incident after dessert contained pistachio; urgency escalated for manager callback.',
    '{"sentiment":"negative","score_label":"poor","topics":["allergy_safety","food_quality"],"urgency":5,"safety_flag":true,"churn_risk":"medium","risk_status_update":"at_risk","reply_draft":null,"internal_note":"Tree nut incident after allergy disclosed - kitchen/service handoff breakdown.","recovery_action":{"type":"urgent_escalation","message_draft":"Priya, this is Sarah from Ember Table. I am deeply sorry about the dessert incident after you shared your allergy. I would like to speak with you today to understand what happened and how we can make this right.","channel":"phone","priority":"urgent"},"follow_up_status":"callback_needed","manager_summary":"Priya Nair reported a tree nut allergy incident after dessert contained pistachio; urgency escalated for manager callback.","auto_send_thank_you":false}'::jsonb,
    'rules_fallback', NULL, NULL, '2026-04-11 21:15:00+00'
  ),
  (
    '00000000-0000-0000-000a-000000000002', '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0003-000000000003', NULL,
    'google', 'Priya Nair', 1,
    'Two stars - slow seating and cold bread.',
    'negative', '["service_speed","food_quality"]'::jsonb, 4, FALSE, 'callback_needed', TRUE,
    'Thank you for taking the time to share this, Priya. I am sorry we missed the mark on pacing and bread service - that is not the Ember Table experience we strive for. I would welcome the chance to make this right personally; please reach out to our host stand.',
    'Repeat Google complaint after internal allergy case - coordinate responses.',
    'Google review from Priya flags service speed and food temperature; public reply drafted.',
    '{"sentiment":"negative","score_label":"critical","topics":["service_speed","food_quality"],"urgency":4,"safety_flag":false,"churn_risk":"high","risk_status_update":"at_risk","reply_draft":"Thank you for taking the time to share this, Priya. I am sorry we missed the mark on pacing and bread service - that is not the Ember Table experience we strive for. I would welcome the chance to make this right personally; please reach out to our host stand.","internal_note":"Repeat Google complaint after internal allergy case - coordinate responses.","recovery_action":{"type":"personal_call","message_draft":null,"channel":"phone","priority":"high"},"follow_up_status":"callback_needed","manager_summary":"Google review from Priya flags service speed and food temperature; public reply drafted.","auto_send_thank_you":false}'::jsonb,
    'rules_fallback', 'rev-google-priya-001', 'google', '2026-04-12 14:00:00+00'
  ),
  (
    '00000000-0000-0000-000a-000000000003', '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0004-000000000003',
    'internal', 'Jennifer Kim', 5,
    'Corporate dinner was flawless - thank the team for the wine pairings.',
    'positive', '["food_quality","ambiance"]'::jsonb, 1, FALSE, 'thankyou_sent', FALSE,
    NULL,
    'VIP corporate host - reinforce relationship.',
    'Jennifer Kim gave 5 stars after private dining; thank-you path selected.',
    '{"sentiment":"positive","score_label":"excellent","topics":["food_quality","ambiance"],"urgency":1,"safety_flag":false,"churn_risk":"low","risk_status_update":"healthy","reply_draft":null,"internal_note":"VIP corporate host - reinforce relationship.","recovery_action":{"type":"thank_you_email","message_draft":"Jennifer, thank you for trusting Ember Table with your corporate dinner. We are thrilled the wine pairings and evening felt seamless, and I have shared your note with the team. We would love to welcome you back anytime.","channel":"email","priority":"low"},"follow_up_status":"thankyou_sent","manager_summary":"Jennifer Kim gave 5 stars after private dining; thank-you path selected.","auto_send_thank_you":true}'::jsonb,
    'rules_fallback', NULL, NULL, '2026-04-10 11:00:00+00'
  ),
  (
    '00000000-0000-0000-000a-000000000004', '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0003-000000000006', NULL,
    'yelp', 'David Chen', 3,
    'Food was good but we waited 40 minutes past our reservation time.',
    'neutral', '["wait_time","food_quality"]'::jsonb, 2, FALSE, 'none', FALSE,
    'David, thank you for your honest feedback - I am sorry for the long wait before your table was ready. We are tightening our pacing on busy nights and would love another chance to show you a smoother evening.',
    'At-risk guest - wait time topic.',
    'David Chen left 3 stars on Yelp citing wait time; neutral sentiment.',
    '{"sentiment":"neutral","score_label":"mixed","topics":["wait_time","food_quality"],"urgency":2,"safety_flag":false,"churn_risk":"medium","risk_status_update":"at_risk","reply_draft":"David, thank you for your honest feedback - I am sorry for the long wait before your table was ready. We are tightening our pacing on busy nights and would love another chance to show you a smoother evening.","internal_note":"At-risk guest - wait time topic.","recovery_action":{"type":"comp_offer","message_draft":"David, thank you for your honest feedback. I am sorry we kept you waiting so long before seating your table. If you are open to it, I would love to invite you back and personally make sure your next experience feels much smoother.","channel":"email","priority":"normal"},"follow_up_status":"none","manager_summary":"David Chen left 3 stars on Yelp citing wait time; neutral sentiment.","auto_send_thank_you":false}'::jsonb,
    'rules_fallback', 'rev-yelp-david-001', 'yelp', '2026-04-08 16:30:00+00'
  )
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  customer_id = EXCLUDED.customer_id,
  appointment_id = EXCLUDED.appointment_id,
  source = EXCLUDED.source,
  guest_name_snapshot = EXCLUDED.guest_name_snapshot,
  score = EXCLUDED.score,
  comment = EXCLUDED.comment,
  sentiment = EXCLUDED.sentiment,
  topics = EXCLUDED.topics,
  urgency = EXCLUDED.urgency,
  safety_flag = EXCLUDED.safety_flag,
  follow_up_status = EXCLUDED.follow_up_status,
  flagged = EXCLUDED.flagged,
  reply_draft = EXCLUDED.reply_draft,
  internal_note = EXCLUDED.internal_note,
  manager_summary = EXCLUDED.manager_summary,
  analysis_json = EXCLUDED.analysis_json,
  analysis_source = EXCLUDED.analysis_source,
  external_review_id = EXCLUDED.external_review_id,
  external_source = EXCLUDED.external_source,
  received_at = EXCLUDED.received_at,
  updated_at = NOW();

INSERT INTO follow_up_actions (
  id, organization_id, feedback_id, action_type, status, channel, priority, message_draft
) VALUES
  (
    '00000000-0000-0000-000b-000000000001', '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-000a-000000000001', 'urgent_escalation', 'pending', 'phone', 'urgent',
    'Priya, this is Sarah from Ember Table. I am deeply sorry about the dessert incident after you shared your allergy. I would like to speak with you today to understand what happened and how we can make this right.'
  ),
  (
    '00000000-0000-0000-000b-000000000002', '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-000a-000000000002', 'personal_call', 'pending', 'phone', 'high', NULL
  )
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  feedback_id = EXCLUDED.feedback_id,
  action_type = EXCLUDED.action_type,
  status = EXCLUDED.status,
  channel = EXCLUDED.channel,
  priority = EXCLUDED.priority,
  message_draft = EXCLUDED.message_draft,
  updated_at = NOW();

INSERT INTO ai_actions (
  id, organization_id, entity_type, entity_id, trigger_type, action_type, input_summary, output_payload_json, status, created_at
) VALUES
  (
    '00000000-0000-0000-000c-000000000001', '00000000-0000-0000-0000-000000000001',
    'feedback', '00000000-0000-0000-000a-000000000001', 'feedback.received', 'customer_service.analyze_review',
    'Priya Nair - score 2 - internal', '{"sentiment":"negative","urgency":5,"safety_flag":true}'::jsonb, 'executed', '2026-04-11 21:16:00+00'
  ),
  (
    '00000000-0000-0000-000c-000000000002', '00000000-0000-0000-0000-000000000001',
    'feedback', '00000000-0000-0000-000a-000000000002', 'feedback.received', 'customer_service.analyze_review',
    'Priya Nair - score 1 - google', '{"sentiment":"negative","urgency":4}'::jsonb, 'executed', '2026-04-12 14:01:00+00'
  ),
  (
    '00000000-0000-0000-000c-000000000003', '00000000-0000-0000-0000-000000000001',
    'feedback', '00000000-0000-0000-000a-000000000003', 'feedback.received', 'customer_service.analyze_review',
    'Jennifer Kim - score 5 - internal', '{"sentiment":"positive","urgency":1}'::jsonb, 'executed', '2026-04-10 11:02:00+00'
  )
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  entity_type = EXCLUDED.entity_type,
  entity_id = EXCLUDED.entity_id,
  trigger_type = EXCLUDED.trigger_type,
  action_type = EXCLUDED.action_type,
  input_summary = EXCLUDED.input_summary,
  output_payload_json = EXCLUDED.output_payload_json,
  status = EXCLUDED.status,
  created_at = EXCLUDED.created_at;
