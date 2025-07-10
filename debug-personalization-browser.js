/**
 * Browser Debug Script for Personalization Issues
 * 
 * Copy and paste this into your browser's developer console (F12 > Console)
 * when you're on the campaigns page to debug the personalization flow.
 */

async function debugPersonalization() {
  console.log('🔍 Starting Personalization Debug...\n');
  
  try {
    // Get the supabase client from the window or import it
    let supabase;
    if (window.supabase) {
      supabase = window.supabase;
    } else {
      // Try to get it from the React context (if available)
      console.log('🔍 Supabase not on window, checking React context...');
      // This will work if you're on the campaigns page
      const reactFiber = document.querySelector('[data-reactroot]')?._reactInternalInstance ||
                        document.querySelector('#root')?._reactInternalFiber ||
                        document.querySelector('#root')?._reactInternalInstance;
      
      if (!reactFiber) {
        console.error('❌ Cannot access supabase client. Please run this on the campaigns page.');
        console.log('💡 Alternative: Try running: import("../lib/supabase").then(m => window.supabase = m.supabase)');
        return;
      }
    }
    
    // If still no supabase, try importing it
    if (!supabase) {
      console.log('🔍 Attempting to import supabase directly...');
      try {
        const supabaseModule = await import('/src/lib/supabase.ts');
        supabase = supabaseModule.supabase;
        console.log('✅ Supabase imported successfully');
      } catch (importError) {
        console.error('❌ Failed to import supabase:', importError);
        console.log('💡 Please make sure you are on the campaigns page and try again.');
        return;
      }
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ No authenticated user found:', userError);
      return;
    }
    
    console.log('✅ User ID:', user.id);

    // 1. Get campaigns
    console.log('\n📋 STEP 1: Getting campaigns...');
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('profile_id', user.id)
      .limit(1);

    if (campaignsError || !campaigns?.length) {
      console.error('❌ No campaigns found:', campaignsError);
      return;
    }

    const campaign = campaigns[0];
    console.log('✅ Campaign found:', campaign.name, 'ID:', campaign.id);
    console.log('📝 Custom system instruction:', campaign.custom_system_instruction);

    // 2. Get campaign leads
    console.log('\n👥 STEP 2: Getting campaign leads...');
    const { data: leads, error: leadsError } = await supabase
      .from('campaign_leads')
      .select('*')
      .eq('campaign_id', campaign.id)
      .limit(1);

    if (leadsError || !leads?.length) {
      console.error('❌ No leads found:', leadsError);
      return;
    }

    const lead = leads[0];
    console.log('✅ Lead found:', lead.first_name, lead.last_name);
    console.log('📋 Lead data:', {
      first_name: lead.first_name,
      last_name: lead.last_name,
      phone_number: lead.phone_number,
      email: lead.email,
      address: lead.address,
      service_requested: lead.service_requested
    });

    // 3. Get AI agent
    console.log('\n🤖 STEP 3: Getting AI agent...');
    if (!campaign.agent_id) {
      console.error('❌ Campaign has no agent_id assigned');
      return;
    }

    const { data: agents, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', campaign.agent_id)
      .single();

    if (agentError || !agents) {
      console.error('❌ Agent not found:', agentError);
      return;
    }

    console.log('✅ Agent found:', agents.name);
    console.log('📝 Agent system instruction:', agents.system_instruction);

    // 4. Check which system instruction is being used
    console.log('\n🔄 STEP 4: Checking system instruction priority...');
    const finalSystemInstruction = campaign.custom_system_instruction || agents.system_instruction;
    console.log('📋 Final system instruction that should be used:', finalSystemInstruction);

    // 5. Test variable replacement
    console.log('\n🔧 STEP 5: Testing variable replacement...');
    
    // Test double curly braces (UI format)
    let testInstruction1 = finalSystemInstruction;
    const doubleVariables = {
      '{{firstName}}': lead.first_name,
      '{{lastName}}': lead.last_name,
      '{{phoneNumber}}': lead.phone_number,
      '{{email}}': lead.email,
      '{{address}}': lead.address,
      '{{serviceRequested}}': lead.service_requested
    };
    
    for (const [variable, value] of Object.entries(doubleVariables)) {
      if (testInstruction1.includes(variable)) {
        console.log(`✅ Found ${variable} in system instruction`);
        testInstruction1 = testInstruction1.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value || 'N/A');
      }
    }
    
    // Test single curly braces (backend format)
    let testInstruction2 = finalSystemInstruction;
    const singleVariables = {
      '{first_name}': lead.first_name,
      '{last_name}': lead.last_name,
      '{phone_number}': lead.phone_number,
      '{email}': lead.email,
      '{address}': lead.address,
      '{service_requested}': lead.service_requested
    };
    
    for (const [variable, value] of Object.entries(singleVariables)) {
      if (testInstruction2.includes(variable)) {
        console.log(`✅ Found ${variable} in system instruction`);
        testInstruction2 = testInstruction2.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value || 'N/A');
      }
    }

    console.log('\n📋 RESULTS:');
    console.log('🔤 Original system instruction:', finalSystemInstruction);
    console.log('🔤 After double brace replacement:', testInstruction1);
    console.log('🔤 After single brace replacement:', testInstruction2);

    // 6. Check if variables were actually replaced
    console.log('\n✅ ANALYSIS:');
    const hasDoubleVariables = /\{\{[^}]+\}\}/.test(finalSystemInstruction);
    const hasSingleVariables = /\{[^}]+\}/.test(finalSystemInstruction);
    
    console.log('🔍 Contains double brace variables {{}}:', hasDoubleVariables);
    console.log('🔍 Contains single brace variables {}:', hasSingleVariables);
    
    if (testInstruction1 !== finalSystemInstruction) {
      console.log('✅ Double brace replacement worked!');
    } else if (testInstruction2 !== finalSystemInstruction) {
      console.log('✅ Single brace replacement worked!');
    } else {
      console.log('❌ No variable replacement occurred - check variable format!');
    }

    // 7. Show recommended fix
    console.log('\n🛠️ RECOMMENDED ACTION:');
    if (hasDoubleVariables && testInstruction1 !== finalSystemInstruction) {
      console.log('✅ System is using double braces correctly. Check backend personalization service.');
    } else if (hasSingleVariables && testInstruction2 !== finalSystemInstruction) {
      console.log('✅ System is using single braces correctly. Check frontend variable format.');
    } else {
      console.log('❌ No variables found or replacement failed. Update system instruction to use proper variable format.');
    }

  } catch (error) {
    console.error('💥 Debug script error:', error);
  }
}

// Run the debug function
debugPersonalization();
