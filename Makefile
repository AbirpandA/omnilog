.PHONY: run-backend run-mobile run test format lint

# Environment Variables for Mac Compatibility
export KMP_DUPLICATE_LIB_OK=TRUE
export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES

run-backend:
	cd backend && source venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000

run-mobile:
	cd mobile && npx expo start -c

run:
	@echo "Starting backend and mobile app simultaneously..."
	make -j2 run-backend run-mobile

test-backend:
	cd backend && source venv/bin/activate && export PYTHONPATH=. && pytest

test-mobile:
	cd mobile && npm run test

test: test-backend test-mobile

format:
	cd backend && source venv/bin/activate && black app/
	cd mobile && npx prettier --write .

lint:
	cd mobile && npm run typecheck
