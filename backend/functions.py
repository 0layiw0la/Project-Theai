import random
import io
from collections import Counter, defaultdict
from PIL import Image, ImageEnhance, ImageOps

from ultralytics import YOLO
import json
import numpy as np # For averaging
import torch # YOLO results might use torch tensors
stage_map ={"red blood cell": 0, "trophozoite": 1, "schizont": 2, "ring": 3, "difficult": 4,"gametocyte":5,"leukocyte":6}
# --- Provided Augmentation Function ---
def augment_microscopic_image(image_path_or_bytes, contrast_factor=(1.0, 2.0), sharpness_factor=(1.0, 3.0), random_saturation_range=(0.5, 1.5)):
    """
    Applies random augmentations to a microscopic image: contrast enhancement,
    sharpening, random saturation, and potentially converts it to grayscale.

    Args:
        image_path_or_bytes (str or bytes): Path to the input image file or image bytes.
        contrast_factor (tuple): Range (min, max) for random contrast enhancement.
        sharpness_factor (tuple): Range (min, max) for random sharpness enhancement.
        random_saturation_range (tuple): Range (min, max) for random saturation adjustment.

    Returns:
        PIL.Image.Image: The augmented RGB PIL image, or None if an error occurs.
                         (Returning RGB as YOLO models typically expect it).
    """
    try:
        if isinstance(image_path_or_bytes, str):
            img = Image.open(image_path_or_bytes).convert("RGB")
        elif isinstance(image_path_or_bytes, bytes):
            img = Image.open(io.BytesIO(image_path_or_bytes)).convert("RGB")
        else:
            print("Error: Input must be a file path (str) or image bytes.")
            return None

        # Apply augmentations
        contrast = random.uniform(contrast_factor[0], contrast_factor[1])
        enhancer_contrast = ImageEnhance.Contrast(img)
        img = enhancer_contrast.enhance(contrast)

        sharpness = random.uniform(sharpness_factor[0], sharpness_factor[1])
        enhancer_sharpness = ImageEnhance.Sharpness(img)
        img = enhancer_sharpness.enhance(sharpness)

        saturation = random.uniform(random_saturation_range[0], random_saturation_range[1])
        enhancer_saturation = ImageEnhance.Color(img)
        img = enhancer_saturation.enhance(saturation)


        print('sucess augmentation')
        # Return the augmented RGB image
        return img

    except FileNotFoundError:
        print(f"Error: Image not found at {image_path_or_bytes}")
        return None
    except Exception as e:
        print(f"An error occurred during augmentation: {e}")
        return None
        

# --- Main Counting Function ---
def calculate_parasite_density(
    image_list,
    asexual_parasite_model, # Expects a loaded YOLO model object
    rbc_model,             # Expects a loaded YOLO model object
    stage_specific_model=None, # Expects a loaded YOLO model object or None
    target_rbc_count=500,
    repetitions=5,
    parasite_class_id=0,
    rbc_class_id=0,
    stage_class_map=stage_map # Example: {0: 'ring', 1: 'trophozoite', 2: 'schizont'}
):
    """
    Calculates malaria parasite density using YOLO models, applying augmentation,
    and averaging results over multiple repetitions.

    Args:
        image_list (list): A list of image file paths (str) or image bytes.
        asexual_parasite_model (YOLO): Loaded YOLO model for detecting asexual parasites.
        rbc_model (YOLO): Loaded YOLO model for detecting uninfected RBCs.
        stage_specific_model (YOLO, optional): Loaded YOLO model for specific stages.
        target_rbc_count (int): Minimum total RBCs (parasitized + uninfected) to count.
        repetitions (int): Number of times to repeat the counting process.
        parasite_class_id (int): Class ID for parasites in asexual_parasite_model.
        rbc_class_id (int): Class ID for RBCs in rbc_model.
        stage_class_map (dict, optional): Mapping from class ID to stage name for stage_specific_model.

    Returns:
        dict: Results including average parasitemia, density, stage counts, and run details.
              Returns None on critical errors.
    """
    print("Stage map received:", stage_map)
    if not image_list:
        print("Error: Image list cannot be empty.")
        return None
    if not isinstance(asexual_parasite_model, YOLO) or not isinstance(rbc_model, YOLO):
         print("Error: asexual_parasite_model and rbc_model must be loaded YOLO model objects.")
         # return None # Commented out for testing with placeholders
    if stage_specific_model and not isinstance(stage_specific_model, YOLO):
         print("Error: stage_specific_model must be a loaded YOLO model object or None.")
         # return None # Commented out for testing with placeholders
    if stage_specific_model and not stage_class_map:
        print("Error: 'stage_class_map' is required when using 'stage_specific_model'.")
        return None

    all_run_results = []
    total_images_processed_per_run = []
    total_rbcs_counted_per_run = []


    for rep in range(repetitions):
        print(f"--- Starting run {rep+1} of {repetitions} ---")
        run_parasite_count = 0
        run_rbc_count = 0
        run_stage_counts_raw = Counter() # Stores {class_id: count} for this run
        images_processed_this_run = 0

        current_image_list = image_list # Process in given order (or shuffle if needed)

        for i, image_data in enumerate(current_image_list):
            current_total_rbcs = run_parasite_count + run_rbc_count
            if current_total_rbcs >= target_rbc_count:
                #print(f"Target RBC count ({target_rbc_count}) reached after {images_processed_this_run} images. Stopping run.")
                break

            # print(f"Processing image {i+1}/{len(current_image_list)}...") # Verbose logging

            # --- 1. Augmentation ---
            augmented_img = augment_microscopic_image(image_data)
            if augmented_img is None:
                
                continue

            images_processed_this_run += 1 # Count only successfully augmented images

            # --- 2. Prediction - Asexual Parasites ---
            try:
                # Use actual model object for prediction
                parasite_results = asexual_parasite_model.predict(augmented_img, verbose=False)
                if parasite_results and parasite_results[0].boxes and parasite_results[0].boxes.cls is not None:
                    # Extract class IDs (convert tensor to list of ints)
                    detected_classes = parasite_results[0].boxes.cls.int().tolist()
                    # Count parasites matching the target class ID
                    parasites_in_image = len(detected_classes)
                    run_parasite_count += parasites_in_image
                else:
                    parasites_in_image = 0
            except Exception as e:
                
                parasites_in_image = 0

            # --- 3. Prediction - Uninfected RBCs ---
            try:
                # Use actual model object for prediction
                rbc_results = rbc_model.predict(augmented_img, verbose=False)
                if rbc_results and rbc_results[0].boxes and rbc_results[0].boxes.cls is not None:
                    detected_classes = rbc_results[0].boxes.cls.int().tolist()
                    rbcs_in_image = detected_classes.count(rbc_class_id)
                    run_rbc_count += rbcs_in_image
                    print(f"RBCs in image: {run_rbc_count}") # Debugging line to check RBC count
                else:
                    rbcs_in_image = 0
            except Exception as e:
                rbcs_in_image = 0

        # --- 4. Prediction - Specific Stages (Optional) ---
        if stage_specific_model:
            try:
                stage_results = stage_specific_model.predict([augment_microscopic_image(im)for im in current_image_list[:images_processed_this_run]], verbose=False)
                if stage_results:
                    for stage_img_results in stage_results:
                        detected_classes = stage_img_results.boxes.cls.int().tolist()
                        # Count occurrences of each relevant stage class ID
                       
                        stages_in_image = Counter(detected_classes)
                        
                        run_stage_counts_raw.update(stages_in_image)
                        print(f"Stages in image: {stages_in_image}") # Debugging line to check stage counts
                            
            except Exception as e:
                pass
        

        # --- Calculate results for this run ---
        total_rbcs_examined = run_parasite_count + run_rbc_count
        parasitemia_percent = (run_parasite_count / total_rbcs_examined * 100) if total_rbcs_examined > 0 else 0.0
        # Density: Parasites per 1000 RBCs examined
        parasite_density_per_1000_rbc = (run_parasite_count / total_rbcs_examined * 1000) if total_rbcs_examined > 0 else 0.0

        # Prepare stage counts with names for this run's summary

        id_labels = {v:k for k,v in stage_class_map.items()}
        run_stage_counts_named = {id_labels[k]: v for k, v in run_stage_counts_raw.items()} if stage_class_map else {}

        run_result = {
            "repetition": rep + 1,
            "parasite_count": run_parasite_count,
            "uninfected_rbc_count": run_rbc_count,
            "total_rbcs_examined": total_rbcs_examined,
            "parasitemia_percent": parasitemia_percent,
            "parasite_density_per_1000_rbc": parasite_density_per_1000_rbc,
            "stage_counts_named": run_stage_counts_named, # For display
            "stage_counts_raw": dict(run_stage_counts_raw), # For averaging {id: count}
            "images_processed": images_processed_this_run,
        }
        all_run_results.append(run_result)
        total_images_processed_per_run.append(images_processed_this_run)
        total_rbcs_counted_per_run.append(total_rbcs_examined)

    # --- Average the results across all repetitions ---
    if not all_run_results:
        print("Error: No results generated.")
        return None

    avg_parasitemia = np.mean([r['parasitemia_percent'] for r in all_run_results])
    avg_density = np.mean([r['parasite_density_per_1000_rbc'] for r in all_run_results])

    # Average stage counts correctly
    avg_stage_counts_final = defaultdict(float)
    if stage_specific_model and stage_class_map:
         total_stage_counts_sum = Counter()
         # Sum the raw counts from all runs
         for run_res in all_run_results:
              total_stage_counts_sum.update(run_res.get("stage_counts_named", {}))

         # Calculate average for each stage
         if repetitions > 0:
             for stage_id, total_count in total_stage_counts_sum.items():
                   stage_name = stage_class_map.get(stage_id, f"Unknown_{stage_id}")
                   avg_stage_counts_final[stage_id] = round(total_count / repetitions)

    return {
        "average_parasitemia_percent": avg_parasitemia,
        "average_parasite_density_per_1000_rbc": avg_density,
        "average_stage_counts": dict(avg_stage_counts_final) if stage_specific_model else {},
        "total_images_processed_per_run": total_images_processed_per_run,
        "total_rbcs_counted_per_run": total_rbcs_counted_per_run,
        "all_run_results": all_run_results,
    }


  # Example mapping

 

