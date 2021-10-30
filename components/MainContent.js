/** Defines main content for teh app */
app.component("main-content", {
  props: {
    data: {
      type: Array,
      required: true,
    },
    errors: {
      type: Array,
      required: true,
    },
  },
  template: /*html*/ `
        <div class='forms'>
            <div class='main-form'>
                <h3>Octomize</h3>

                <optimization-selector type="benchmark" title="Benchmark" subtitle="This is some sub content to explain benchmarking." :options="benchmark_options" @did-select-type="handleTypeChecked" @did-update="handleOptionsChanged"></optimization-selector>
                
                <optimization-selector type="accelerate" title="Accelerate" subtitle="Could even open this accordion for a paragraph of text." :options="acceleration_options" @did-select-type="handleTypeChecked" @did-update="handleOptionsChanged"></optimization-selector>

            
                <div id='hardware-targets-header'>
                    <h4 style="flex:1">Hardware Targets</h4>
                    <button id="add-button" style="height:32px" @click="addTarget">Add</button>
                </div>
                <table>
                    <tr class='table-header'>
                        <th id="first" style="width:256px">PROVIDER</th> 
                        <th style="width:256px">INSTANCE</th>
                        <th style="width:103px">VCPU</th>
                        <th style="width:103px">MEMORY (GIB)</th>
                        <th style="flex:1"></th>
                    </tr>
                    <tr v-for='(target, index) in targets' class="target-row">
                        <td style="width:256px">
                            <styled-select placeholder="Select Provider" :opts="providers(index)" v-model="target.provider" @update:modelValue="handleTargetChanged(index)"></styled-select>
                        </td>
                        <td style="width:256px">
                            <styled-select placeholder="Select Instance" :opts="instances(index)" v-model="target.instance" :class="{ disabled: !target.provider }" @update:modelValue="handleTargetChanged(index)"></styled-select>
                        </td>
                        <td id='cpu' style="width:103px" :class="[ !target.provider || !target.instance ? 'cell-disabled' : '']">
                            {{ target.cpu }}
                        </td>
                        <td id="memory" style="width:103px" :class="[ !target.provider || !target.instance ? 'cell-disabled' : '']">
                            {{ target.memory }}
                        </td>
                        <td class='delete-cell' style="flex:1">
                            <img v-if="target.provider && target.instance" class='delete-button' src='./assets/images/delete.png' @click="handleRemove(index)">
                        </td>
                    </tr>
                </table>
            </div>

            <div class='summary-form-container'>
                <div class='summary-form'>
                    <p id="total-label">Total runs</p>
                    <p id="total" :class="[ runsHadError ? 'failure' : 'success']">{{ totalRuns }}</p>
                    <div v-for="(target, index) in validTargets" class='summary-row'>
                        <div class='summary-item-left'>
                            <p class='summary-item-instance'>{{ target.instance }}</p>
                            <p class='summary-item-cores'>{{ target.cpu }} cores</p>
                        </div>
                        <p class='summary-item-runs' :class="[ errors.length > index ? errors[index] ? 'success' : 'failure' : '' ]">{{ runs }}</p>
                    </div>

                    <button class="octomize-button" :disabled="!canOctomize" :class="{ disabled: !canOctomize }" @click="handleOctomize">Octomize</button>
                </div>
            </div>

        </div>
    `,

  data() {
    return {
      types: [], // for the types of endpoints to hit
      // benchmarking options
      benchmark_options: {
        engine: "ONNX",
        num_trials: 1,
        runs_per_trial: 1,
      },
      // acceleration options
      acceleration_options: {
        engine: "ONNX",
        kernel_trials: 1,
      },
      // current targets
      targets: [{ provider: "", instance: "", cpu: 0, memory: 0 }],
    };
  },

  methods: {
    /** Handles adding or removing a type from our current types. */
    handleTypeChecked({ checked, type }) {
      const ind = this.types.indexOf(type);
      if (!checked && ind >= 0) {
        this.types.splice(ind, 1);
      } else if (checked && ind < 0) {
        this.types.push(type);
      }
    },
    /** Handles adding a target to the list */
    addTarget() {
      if (this.targets.length >= this.data.length) {
        return;
      }
      this.targets.push({ provider: "", instance: "", cpu: 0, memory: 0 });
      this.$emit("targets-changed");
    },

    /** Retrieves a target by its index */
    getTarget(targetIndex) {
      return this.targets[targetIndex];
    },
    /** Retrieves hardware by a target index, if it exists (if a target doesn't have both provider and instance specified then the hardware for that target index will return null) */
    getHardware(targetIndex) {
      const target = this.getTarget(targetIndex);
      const item = this.data.find((v) => v.provider == target.provider && v.instance == target.instance);

      return item;
    },
    /** Checks if target exists for this specific hardware target (that isnt the current target at index).*/
    doesTargetExist(hardware, index) {
      return (
        this.targets.find(
          (v, ind) => ind != index && v.provider == hardware.provider && v.instance == hardware.instance
        ) !== undefined
      );
    },
    /** Handles removing a target from the list. */
    handleRemove(index) {
      this.targets.splice(index, 1);
      if (this.targets.length == 0) {
        this.addTarget();
      } else {
        this.$emit("targets-changed");
      }
    },
    handleOptionsChanged() {
      this.$emit('targets-changed') // for easy notifications
    },
    /** Handles updating values/validating the rows for when the target provider/instance changes. */
    handleTargetChanged(index) {
      const target = this.targets[index];

      const instances = this.data.filter((v) => v.provider == target.provider).map((v) => v.instance);

      if (!instances.includes(target.instance)) {
        target.instance = "";
      }

      target.cpu = this.vcpu(index);
      target.memory = this.memory(index);

      this.$emit("targets-changed");
    },
    /** Gets all providers for a specific target (ensures that providers that have already been used in all combinations are not displayed). */
    providers(index) {
      if (index == undefined) {
        return [];
      }

      return this.data
        .filter((v) => !this.doesTargetExist(v, index))
        .map((v) => v.provider)
        .filter((v, i, s) => s.indexOf(v) === i);
    },
    /** Gets all instances for a specific target (ensures that instances that have already been used in all combinations are not displayed). */
    instances(index) {
      if (index == undefined) {
        return [];
      }

      const target = this.getTarget(index);
      return this.data
        .filter((v) => v.provider == target.provider && !this.doesTargetExist(v, index))
        .map((v) => v.instance);
    },
    /** Gets the current vcpu value for the hardware item at the specified index. */
    vcpu(index) {
      const item = this.getHardware(index);
      return (item && item.cpu) || 0;
    },
    /** Gets the current memory value for the hardware item at the specified index. */
    memory(index) {
      const item = this.getHardware(index);

      return (item && item.memory) || 0;
    },

    /** Creates the list of /benchmark payloads to be sent. */
    getBenchmarkPayloads() {
      if (!this.types.includes("benchmark")) {
        return null;
      }
      let result = [];

      for (let target of this.targets) {
        // just following teh schema here
        result.push({
          engine: this.benchmark_options.engine,
          hardware: target,
          // need to parse ints out of these due to how inputs emit values
          num_trials: parseInt(this.benchmark_options.num_trials),
          runs_per_trial: parseInt(this.benchmark_options.runs_per_trial),
        });
      }

      return result;
    },

    /** Creates the list of /accelerate payloads to be sent. */
    getAcceleratePayloads() {
      if (!this.types.includes("accelerate")) {
        return null;
      }

      let result = [];

      for (let target of this.targets) {
        // we need a specific schema for when engine is TVM vs ONNX
        const engine =
          this.acceleration_options.engine == "TVM"
            ? // need to parse ints out of the kernel trials due to how inputs emit values
              { TVM: { kernel_trials: parseInt(this.acceleration_options.kernel_trials) } }
            : this.acceleration_options.engine;

        result.push({
          engine: engine,
          hardware: target,
        });
      }

      return result;
    },

    /** emits the start-runs event to notify the app to start sending payload data for result checking. */
    handleOctomize() {
      this.$emit("start-runs", {
        benchmark: this.getBenchmarkPayloads(),
        accelerate: this.getAcceleratePayloads(),
      });
    },
  },

  computed: {
    /** Returns the list of targets that have both a provider and an instance */
    validTargets() {
      return this.targets.filter((v) => v.provider && v.instance && v.cpu && v.memory);
    },
    /** Returns whether or not we can send our targets in payloads. */
    canOctomize() {
      return this.validTargets.length > 0 && this.targets.length == this.validTargets.length && this.types.length > 0;
    },
    /** Returns the int value of the num_trials /benchmark option. */
    benchmarkTrials() {
      return parseInt(this.benchmark_options.num_trials);
    },
    /** Returns the int value of the runs_per_trial /benchmark option. */
    benchmarkRuns() {
      return parseInt(this.benchmark_options.runs_per_trial);
    },
    /** Returns the int value of the kerenl_trials /accelerate option. */
    accelerateKernelTrials() {
      return this.acceleration_options.engine == "TVM" ? parseInt(this.acceleration_options.kernel_trials) : 1;
    },
    /** Returns the total number of runs per target that will be ran when the current targets and types are sent. */
    runs() {
      let runs = 0;
      if (this.types.includes("benchmark") && this.benchmark_options.engine) {
        runs += this.benchmarkTrials * this.benchmarkRuns;
      }

      if (this.types.includes("accelerate") && this.acceleration_options.engine) {
        runs += this.accelerateKernelTrials;
      }

      return runs;
    },
    /** Returns the total number of runs (which is the # of valid targets multiplied by the number of runs per target). */
    totalRuns() {
      return this.runs * this.validTargets.length;
    },
    /** Computes whether or not we had an error from the last run. */
    runsHadError() {
      return this.errors.includes(false);
    },
  },
});

/** Optimization selector, which is just a wrapper for the component that encompasses the accordion style dropdown for /benchmark options and /accelerate options. */
app.component("optimization-selector", {
  props: {
    // type of optimization (benchmark or acceleration)
    type: {
      type: String,
      required: true,
    },
    // title
    title: {
      type: String,
      required: true,
    },
    // subtitle
    subtitle: {
      type: String,
      required: true,
    },
    // options object to display (specific to benchmark/acceleration)
    options: {
      type: Object,
      required: true,
    },
  },

  template: /*html*/ `
        <div class="option-pane-container">
            <div class="option-pane" @click="toggleExpand">
                <input id='check' type="checkbox" @click.stop @change="handleCheckbox($event)">
                <div style="flex:1"> 
                    <p id="title">{{ title }}</p>
                    <p id="subtitle">{{ subtitle }}</p>
                </div>
                <img style="width:10px" src='./assets/images/chevron.png' :class="{ expanded: expanded }" />
            </div>
            <div class="option-pane-options" v-if="expanded && type == 'benchmark'">
                <label for='trials'>Engine</label>
                <styled-select id='engine' width="100px" v-model="options.engine" @update:modelValue="handleDidUpdate" :opts="engines"></styled-select>
                <label for='trials' :class="{ disabled: !options.engine }"># of Trials</label>
                <input :disabled="!options.engine" id="trials" type='number' @input="handleDidUpdate" v-model="options.num_trials">
                <label for='runs' :class="{ disabled: !options.engine }">Runs Per Trial</label>
                <input :disabled="!options.engine" id="runs" type='number' @input="handleDidUpdate" v-model="options.runs_per_trial">

            </div>
            <div class="option-pane-options" v-if="expanded && type == 'accelerate'">
                <label for='trials'>Engine</label>
                <styled-select id='engine' width="100px" v-model="options.engine" @update:modelValue="handleDidUpdate" :opts="engines"></styled-select>
                <label for='kernel_trials' v-if="options.engine == 'TVM'">Kernel Trials</label>
                <input id="kernel_trials" v-if="options.engine == 'TVM'" @input="handleDidUpdate" type='number' v-model="options.kernel_trials">

            </div>
        </div>
    `,

  data() {
    return {
      expanded: false, // whether or not the accordion is expanded
      engines: ["ONNX", "TVM"], // the engines we can use
    };
  },

  methods: {
    /** Toggles the expansion */
    toggleExpand() {
      this.expanded = !this.expanded;
    },
    /** Handles the checkbox check */
    handleCheckbox(evt) {
      this.$emit("did-select-type", { checked: evt.target.checked, type: this.type });
      this.handleDidUpdate()
    },

    handleDidUpdate() {
      this.$emit("did-update")
    }
  },
});

/** Custom wrapper/implementation for a select input, which is necessary due to the lack of customization that can be done on the dropdown element itself. */
app.component("styled-select", {
  // need tabindex="0" to focus div
  // @blur will give us that unfocus effect we get with a real select input
  template: /*html*/ `
        <div class="styled-select" @blur="unfocus" tabindex="0"> 
            <div class="select-dropdown" :style="[ width ? { width: width } : {}]" v-if="open">
                <div class="select-options" v-for="(opt, i) of opts" @click="handleClick(opt)">{{ opt }}</div>
            </div>
            <div class="select-input" @click="toggleOpen">
                <p>{{ selected }}</p>
                <img src="./assets/images/chevron.png">
            </div>
        </div>
    `,
  props: {
    // options to display
    opts: {
      type: Array,
      required: true,
    },
    // placeholder text
    placeholder: {
      type: String,
      required: false,
      default: "",
    },
    // we need this for being able to use v-model
    modelValue: {
      type: String,
    },
    // width for forcing a specific width of the dropdown (workaround)
    width: {
      type: String,
    },
    disabled: {
      type: Boolean,
    },
  },
  data() {
    return {
      // whether the dropdown is open or not
      open: false,
      // the current selected value
      selected_value: this.placeholder || "",
    };
  },
  methods: {
    /** Hadles unfocus/blur event. */
    unfocus() {
        this.open = false
    },
    /** Toggles open (when possible). */
    toggleOpen() {
      if (this.disabled) {
        return;
      }
      if (this.opts.length == 0) {
        return;
      }
      this.open = !this.open;
    },
    /** Handles click (when possible). */
    handleClick(option) {
      if (this.disabled) {
        return;
      }
      if (this.opts.length == 0) {
        return;
      }

      this.selected_value = option;
      this.open = false;
      // need this to use v-model
      this.$emit("update:modelValue", option);
    },
  },
  computed: {
    /** Returns the value to display in the input/label part of the custom select component. */
    selected() {
      return this.modelValue || this.placeholder;
    },
  },
});
