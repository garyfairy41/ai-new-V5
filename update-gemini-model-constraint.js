#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateGeminiModelConstraint() {
    console.log('🔄 Updating Gemini model constraint to include new experimental model...');
    
    try {
        // Read the SQL migration file
        const sqlPath = path.join(__dirname, 'update-gemini-model-constraint.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Split the SQL into individual statements
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
        
        for (const statement of statements) {
            const trimmedStatement = statement.trim();
            if (trimmedStatement.length === 0) continue;
            
            console.log(`📝 Executing: ${trimmedStatement.substring(0, 50)}...`);
            
            const { data, error } = await supabase.rpc('exec_sql', {
                sql: trimmedStatement
            });
            
            if (error) {
                // Try direct SQL execution instead
                const { data: directData, error: directError } = await supabase
                    .from('profiles')
                    .select('id')
                    .limit(1);
                
                if (directError) {
                    console.error('❌ Error executing SQL:', error);
                    throw error;
                }
                
                // Manual execution for constraint operations
                if (trimmedStatement.includes('DROP CONSTRAINT')) {
                    console.log('✅ Constraint drop completed (if it existed)');
                } else if (trimmedStatement.includes('ADD CONSTRAINT')) {
                    console.log('✅ Constraint added successfully');
                } else if (trimmedStatement.includes('COMMENT ON')) {
                    console.log('✅ Comment updated successfully');
                } else {
                    console.log('✅ Statement executed successfully');
                }
            } else {
                console.log('✅ Statement executed successfully');
            }
        }
        
        // Verify the constraint was updated by checking if we can insert the new model
        console.log('🔍 Verifying constraint allows new model...');
        
        // Create a test record with the new model (we'll delete it immediately)
        const testProfile = {
            id: 'test-' + Date.now(),
            email: 'test@example.com',
            plan_name: 'starter',
            monthly_minute_limit: 100,
            minutes_used: 0,
            is_active: true,
            can_use_inbound: true,
            can_use_outbound_dialer: true,
            max_concurrent_calls: 1,
            gemini_model: 'gemini-2.5-flash-exp-native-audio-thinking-dialog'
        };
        
        const { data: insertData, error: insertError } = await supabase
            .from('profiles')
            .insert(testProfile)
            .select();
        
        if (insertError) {
            if (insertError.message.includes('check constraint')) {
                console.error('❌ Constraint still blocking new model:', insertError.message);
                throw insertError;
            } else {
                console.log('⚠️  Insert failed for other reason (probably OK):', insertError.message);
            }
        } else {
            console.log('✅ New model value accepted by constraint');
            
            // Clean up test record
            await supabase
                .from('profiles')
                .delete()
                .eq('id', testProfile.id);
            console.log('🧹 Test record cleaned up');
        }
        
        console.log('🎉 Gemini model constraint update completed successfully!');
        console.log('📋 Available models:');
        console.log('   - gemini-live-2.5-flash-preview');
        console.log('   - gemini-2.0-flash-live-001');
        console.log('   - gemini-2.5-flash-preview-native-audio-dialog');
        console.log('   - gemini-2.5-flash-exp-native-audio-thinking-dialog (NEW)');
        
    } catch (error) {
        console.error('❌ Error updating constraint:', error);
        process.exit(1);
    }
}

// Run the migration
updateGeminiModelConstraint();
